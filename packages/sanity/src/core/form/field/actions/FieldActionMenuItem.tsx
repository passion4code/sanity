import {Text} from '@sanity/ui'
import React, {useCallback} from 'react'
import {CheckmarkIcon} from '@sanity/icons'
import {TooltipOfDisabled} from '../../../components'
import {DocumentFieldActionItem} from '../../../config'
import {MenuItem} from '../../../../ui'

export function FieldActionMenuItem(props: {action: DocumentFieldActionItem}) {
  const {action} = props

  const handleClick = useCallback(() => {
    action.onAction()
  }, [action])

  const disabledTooltipContent = typeof action.disabled === 'object' && (
    <Text size={1}>{action.disabled.reason}</Text>
  )

  return (
    <TooltipOfDisabled content={disabledTooltipContent} placement="left">
      <MenuItem
        disabled={Boolean(action.disabled)}
        icon={action.icon}
        iconRight={action.iconRight || (action.selected ? CheckmarkIcon : undefined)}
        onClick={handleClick}
        pressed={action.selected}
        text={action.title}
        tone={action.tone}
      />
    </TooltipOfDisabled>
  )
}
