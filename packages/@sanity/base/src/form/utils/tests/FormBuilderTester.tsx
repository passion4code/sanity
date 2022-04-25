import {Schema, SanityDocument} from '@sanity/types'
import {LayerProvider, studioTheme, ThemeProvider, ToastProvider} from '@sanity/ui'
import {render} from '@testing-library/react'
import React from 'react'
import {FormBuilderFilterFieldFn, FIXME} from '../../types'
import {StudioFormBuilder} from '../../studio/StudioFormBuilder'
import {createPatchChannel, PatchChannel} from '../../patch/PatchChannel'
import {FieldProps} from '../../store/types'

export type FormBuilderTesterProps = FieldProps & {
  schema: Schema
  patchChannel: PatchChannel
  filterField: FormBuilderFilterFieldFn
  autoFocus?: boolean
  changesOpen: boolean
}

const patchChannel = createPatchChannel()

export const DEFAULT_PROPS = {
  level: 0,
  validation: [],
  presence: [],
  compareValue: undefined,
  readOnly: undefined,
  filterField: () => true,
  patchChannel: patchChannel as FIXME,
  onBlur: () => undefined,
  autoFocus: undefined,
  focusPath: [],
  changesOpen: false,
}

// Use this to test specific inputs rendered in the form-builder
export function inputTester(document: SanityDocument, type: any, schema: Schema, testId?: string) {
  const onFocus = jest.fn()
  const onBlur = jest.fn()
  const onChange = jest.fn()

  const {queryByTestId} = render(
    <FormBuilderTester
      {...(DEFAULT_PROPS as any)}
      schema={schema}
      value={document}
      type={type}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  )

  const inputContainer = testId ? queryByTestId(testId) : undefined

  return {onChange, onFocus, onBlur, inputContainer}
}

// Use this in your test to get full control when testing the form builder
// the default props are available in DEFAULT_props
export function FormBuilderTester(props: FormBuilderTesterProps) {
  return (
    <ThemeProvider scheme="light" theme={studioTheme}>
      <LayerProvider>
        <ToastProvider>
          <StudioFormBuilder {...(props as FIXME)} />
        </ToastProvider>
      </LayerProvider>
    </ThemeProvider>
  )
}
