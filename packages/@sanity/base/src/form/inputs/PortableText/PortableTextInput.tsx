import {ArraySchemaType, Path} from '@sanity/types'
import {
  EditorChange,
  OnCopyFn,
  OnPasteFn,
  Patch as EditorPatch,
  PortableTextBlock,
  PortableTextEditor,
  HotkeyOptions,
  EditorSelection,
  InvalidValue,
} from '@sanity/portable-text-editor'
import {FOCUS_TERMINATOR} from '@sanity/util/paths'
import React, {useEffect, useState, useMemo, useCallback, useRef, useImperativeHandle} from 'react'
import {Subject} from 'rxjs'
import {Box, Text, useToast} from '@sanity/ui'
import scrollIntoView from 'scroll-into-view-if-needed'
import {FormPatch as FormBuilderPatch} from '../../patch'
import type {
  ArrayOfObjectsInputProps,
  FIXME,
  PortableTextMarker,
  RenderCustomMarkers,
} from '../../types'
import {EMPTY_ARRAY} from '../../utils/empty'
import {Compositor} from './Compositor'
import {InvalidValue as RespondToInvalidContent} from './InvalidValue'
import {usePatches} from './usePatches'
import {VisibleOnFocusButton} from './VisibleOnFocusButton'
import {RenderBlockActionsCallback} from './types'

/**
 * @alpha
 */
export interface PortableTextInputProps
  extends ArrayOfObjectsInputProps<PortableTextBlock, ArraySchemaType> {
  hotkeys?: HotkeyOptions
  markers?: PortableTextMarker[]
  onCopy?: OnCopyFn
  onPaste?: OnPasteFn
  renderBlockActions?: RenderBlockActionsCallback
  renderCustomMarkers?: RenderCustomMarkers
}

/**
 * An outer React PureComponent Class purely to satisfy the form-builder's need for 'blur' and 'focus' class methods.
 *
 * @alpha
 */
export function PortableTextInput(props: PortableTextInputProps) {
  const {
    focused,
    focusPath,
    focusRef,
    hotkeys,
    markers = [],
    members,
    onChange,
    onCopy,
    onInsert,
    onPaste,
    onCollapse,
    onExpand,
    path,
    renderBlockActions,
    renderCustomMarkers,
    renderItem,
    schemaType: type,
    value,
    // onBlur,
    // onFocus,
    onFocusPath,
    readOnly,
  } = props

  // Make the PTE focusable from the outside
  useImperativeHandle(focusRef, () => ({
    focus() {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
      }
    },
  }))

  const {subscribe} = usePatches({path})
  const editorRef = useRef<PortableTextEditor | null>(null)
  const [hasFocus, setHasFocus] = useState(false)
  const [ignoreValidationError, setIgnoreValidationError] = useState(false)
  const [invalidValue, setInvalidValue] = useState<InvalidValue | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const toast = useToast()

  // Memoized patch stream
  const remotePatchSubject: Subject<EditorPatch> = useMemo(() => new Subject(), [])
  const remotePatch$ = useMemo(() => remotePatchSubject.asObservable(), [remotePatchSubject])

  const innerElementRef = useRef<HTMLDivElement | null>(null)

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((v) => !v)
    if (editorRef.current) PortableTextEditor.focus(editorRef.current)
  }, [editorRef])

  // Reset invalidValue if new value is coming in from props
  useEffect(() => {
    if (invalidValue && value !== invalidValue.value) {
      setInvalidValue(null)
    }
  }, [invalidValue, value])

  // Subscribe to incoming patches
  useEffect(() => {
    return subscribe(({patches}): void => {
      const patchSelection =
        patches && patches.length > 0 && patches.filter((patch) => patch.origin !== 'local')

      if (patchSelection) {
        patchSelection.map((patch) => remotePatchSubject.next(patch))
      }
    })
  }, [remotePatchSubject, subscribe])

  // Handle editor changes
  const handleEditorChange = useCallback(
    (change: EditorChange): void => {
      switch (change.type) {
        case 'mutation':
          setTimeout(() => {
            onChange(change.patches as FormBuilderPatch[])
          })
          break
        case 'selection':
          if (
            editorRef.current &&
            shouldSetEditorFormBuilderFocus(
              editorRef.current,
              change.selection,
              focusPath || EMPTY_ARRAY
            )
          ) {
            if (change.selection?.focus.path) {
              onFocusPath(change.selection?.focus.path)
            }
          }
          break
        case 'focus':
          setHasFocus(true)
          onFocusPath(
            (editorRef.current && PortableTextEditor.getSelection(editorRef.current)?.focus.path) ||
              []
          )

          break
        case 'blur':
          setHasFocus(false)
          break
        case 'undo':
        case 'redo':
          setTimeout(() => {
            onChange(change.patches as FormBuilderPatch[])
          })
          break
        case 'invalidValue':
          setInvalidValue(change)
          break
        case 'error':
          toast.push({
            status: change.level,
            description: change.description,
          })

          break
        default:
      }
    },
    [focusPath, editorRef, onChange, onFocusPath, toast]
  )

  const handleFocusSkipperClick = useCallback(() => {
    if (editorRef.current) {
      PortableTextEditor.focus(editorRef.current)
    }
  }, [editorRef])

  const handleIgnoreValidation = useCallback((): void => {
    setIgnoreValidationError(true)
  }, [])

  const respondToInvalidContent = useMemo(() => {
    if (invalidValue && invalidValue.resolution) {
      return (
        <Box marginBottom={2}>
          <RespondToInvalidContent
            onChange={handleEditorChange}
            onIgnore={handleIgnoreValidation}
            resolution={invalidValue.resolution}
          />
        </Box>
      )
    }
    return null
  }, [handleEditorChange, handleIgnoreValidation, invalidValue])

  // Scroll to *the field* (not the editor) into view if we have focus in the field.
  // For internal editor scrolling see useScrollToFocusFromOutside and useScrollSelectionIntoView in
  // the Compositor component.
  useEffect(() => {
    if (focusPath && focusPath.length > 0 && innerElementRef.current) {
      scrollIntoView(innerElementRef.current, {
        scrollMode: 'if-needed',
      })
    }
  }, [focusPath])

  return (
    <Box ref={innerElementRef}>
      {!readOnly && (
        <VisibleOnFocusButton onClick={handleFocusSkipperClick}>
          <Text>Go to content</Text>
        </VisibleOnFocusButton>
      )}

      {!ignoreValidationError && respondToInvalidContent}
      {(!invalidValue || ignoreValidationError) && (
        <PortableTextEditor
          ref={editorRef}
          incomingPatches$={remotePatch$}
          onChange={handleEditorChange}
          maxBlocks={undefined} // TODO: from schema?
          readOnly={readOnly}
          type={type as FIXME}
          value={value}
        >
          <Compositor
            {...props}
            focusPath={focusPath}
            focused={focused}
            hasFocus={hasFocus}
            hotkeys={hotkeys}
            isFullscreen={isFullscreen}
            markers={markers}
            members={members}
            onChange={onChange}
            onCopy={onCopy}
            onInsert={onInsert}
            onPaste={onPaste}
            onCollapse={onCollapse}
            onExpand={onExpand}
            onToggleFullscreen={handleToggleFullscreen}
            patches$={remotePatchSubject}
            renderBlockActions={renderBlockActions}
            renderCustomMarkers={renderCustomMarkers}
            renderItem={renderItem}
            value={value}
          />
        </PortableTextEditor>
      )}
    </Box>
  )
}

function shouldSetEditorFormBuilderFocus(
  editor: PortableTextEditor,
  selection: EditorSelection | undefined,
  focusPath: Path
) {
  return (
    selection && // If we have something selected
    focusPath.slice(-1)[0] !== FOCUS_TERMINATOR && // Not if in transition to open modal
    PortableTextEditor.isObjectPath(editor, focusPath) === false // Not if this is pointing to an embedded object
  )
}
