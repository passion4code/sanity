import {Badge, Card, Flex, Text, TextSkeleton} from '@sanity/ui'
// eslint-disable-next-line camelcase
import {getTheme_v2} from '@sanity/ui/theme'
import {useCallback, useMemo} from 'react'
import {set, type StringInputProps} from 'sanity'
import styled, {css} from 'styled-components'

import {useMentionUser} from '../../../context'
import {TasksUserAvatar} from '../../TasksUserAvatar'
import {AssigneeSelectionMenu} from './AssigneeSelectionMenu'

const FocusableCard = styled(Card)((props) => {
  const theme = getTheme_v2(props.theme)
  return css`
    &[data-as='button'] {
      border: 1px solid var(--card-border-color);
      &:focus-within {
        border: 1px solid var(--card-focus-ring-color);
      }
      --card-muted-fg-color: ${theme.color.input.default.enabled.placeholder};
    }
  `
})

export function AssigneeCreateFormField(props: StringInputProps) {
  const {value, onChange} = props
  const {mentionOptions} = useMentionUser()
  const mentionedUser = useMemo(
    () => mentionOptions.data?.find((u) => u.id === value),
    [mentionOptions.data, value],
  )

  const onSelect = useCallback((userId: string) => onChange(set(userId)), [onChange])

  const displayText = useMemo(() => {
    if (value) {
      if (mentionOptions.loading) return <TextSkeleton animated style={{width: '10ch'}} />
      if (mentionedUser) return mentionedUser.displayName || mentionedUser.email
      if (!mentionedUser) return 'User not found'
    }
    return 'Search username'
  }, [mentionOptions.loading, mentionedUser, value])

  return (
    <AssigneeSelectionMenu
      onSelect={onSelect}
      menuButton={
        <FocusableCard data-as="button" padding={1} radius={2} tabIndex={0}>
          <Flex align="center" gap={3}>
            <Flex align="center" gap={1} flex={1}>
              <TasksUserAvatar user={mentionedUser} size={1} border={false} />
              <Text size={1} textOverflow="ellipsis" muted={!mentionedUser}>
                {displayText}
              </Text>
            </Flex>

            {value && mentionedUser && !mentionedUser.granted && (
              <Badge fontSize={1} mode="outline">
                Unauthorized
              </Badge>
            )}
          </Flex>
        </FocusableCard>
      }
    />
  )
}
