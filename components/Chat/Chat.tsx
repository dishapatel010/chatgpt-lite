'use client'

import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react'
import { Flex, Heading, IconButton, ScrollArea, Tooltip, Button, TextField } from '@radix-ui/themes'
import ContentEditable from 'react-contenteditable'
import { AiOutlineClear, AiOutlineLoading3Quarters, AiOutlineUnorderedList } from 'react-icons/ai'
import { FiSend } from 'react-icons/fi'
import sanitizeHtml from 'sanitize-html'
import { toast } from 'sonner'
import ChatContext from './chatContext'
import type { Chat, ChatMessage } from './interface'
import Message from './Message'

import './index.scss'

export interface ChatProps {}

export interface ChatGPInstance {
  setConversation: (messages: ChatMessage[]) => void
  getConversation: () => ChatMessage[]
  focus: () => void
}

// ✅ Modified to accept apiKey
const postChatOrQuestion = async (chat: Chat, messages: any[], input: string, apiKey: string) => {
  const url = '/api/chat'

  const data = {
    prompt: chat?.persona?.prompt,
    messages: [...messages],
    input
  }

  return await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify(data)
  })
}

const Chat = (props: ChatProps, ref: any) => {
  const { debug, currentChatRef, saveMessages, onToggleSidebar, forceUpdate } =
    useContext(ChatContext)

  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [message, setMessage] = useState('')
  const [currentMessage, setCurrentMessage] = useState<string>('')

  const conversationRef = useRef<ChatMessage[]>()
  const conversation = useRef<ChatMessage[]>([])
  const textAreaRef = useRef<HTMLElement>(null)
  const bottomOfChatRef = useRef<HTMLDivElement>(null)

  const sendMessage = useCallback(
    async (e: any) => {
      if (!isLoading) {
        e.preventDefault()
        const input = sanitizeHtml(textAreaRef.current?.innerHTML || '')
        if (!input) {
          toast.error('Please type a message to continue.')
          return
        }
        if (!apiKey) {
          toast.error('API key is required.')
          return
        }

        const message = [...conversation.current]
        conversation.current = [...conversation.current, { content: input, role: 'user' }]
        setMessage('')
        setIsLoading(true)
        try {
          const response = await postChatOrQuestion(currentChatRef?.current!, message, input, apiKey)

          if (response.ok) {
            const data = response.body
            if (!data) throw new Error('No data')

            const reader = data.getReader()
            const decoder = new TextDecoder('utf-8')
            let done = false
            let resultContent = ''

            while (!done) {
              try {
                const { value, done: readerDone } = await reader.read()
                const char = decoder.decode(value)
                if (char) {
                  setCurrentMessage((state) => {
                    if (debug) console.log({ char })
                    resultContent = state + char
                    return resultContent
                  })
                }
                done = readerDone
              } catch {
                done = true
              }
            }

            setTimeout(() => {
              if (debug) console.log({ resultContent })
              conversation.current = [
                ...conversation.current,
                { content: resultContent, role: 'assistant' }
              ]
              setCurrentMessage('')
            }, 1)
          } else {
            const result = await response.json()
            if (response.status === 401) {
              conversation.current.pop()
              toast.error(result.error)
            } else {
              toast.error(result.error)
            }
          }

          setIsLoading(false)
        } catch (error: any) {
          console.error(error)
          toast.error(error.message)
          setIsLoading(false)
        }
      }
    },
    [currentChatRef, debug, isLoading, apiKey]
  )

  const handleKeypress = useCallback(
    (e: any) => {
      if (e.keyCode == 13 && !e.shiftKey) {
        sendMessage(e)
        e.preventDefault()
      }
    },
    [sendMessage]
  )

  const clearMessages = () => {
    conversation.current = []
    forceUpdate?.()
  }

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = '50px'
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight + 2}px`
    }
  }, [message, textAreaRef])

  useEffect(() => {
    if (bottomOfChatRef.current) {
      bottomOfChatRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conversation, currentMessage])

  useEffect(() => {
    conversationRef.current = conversation.current
    if (currentChatRef?.current?.id) {
      saveMessages?.(conversation.current)
    }
  }, [currentChatRef, conversation.current, saveMessages])

  useEffect(() => {
    if (!isLoading) {
      textAreaRef.current?.focus()
    }
  }, [isLoading])

  useImperativeHandle(ref, () => ({
    setConversation(messages: ChatMessage[]) {
      conversation.current = messages
      forceUpdate?.()
    },
    getConversation() {
      return conversationRef.current
    },
    focus: () => {
      textAreaRef.current?.focus()
    }
  }))

  return (
    <Flex direction="column" height="100%" className="relative" gap="3">
      {/* Header */}
      <Flex
        justify="center"
        align="center"
        py="3"
        px="4"
        style={{
          backgroundColor: 'var(--gray-a2)',
          borderBottom: '1px solid var(--gray-a4)',
          position: 'relative'
        }}
      >
        <Flex gap="2" align="center" className="absolute left-4 top-1/2 -translate-y-1/2 md:hidden">
          <Tooltip content="Toggle Sidebar">
            <IconButton
              variant="soft"
              color="gray"
              size="2"
              className="rounded-lg cursor-pointer"
              disabled={isLoading}
              onClick={onToggleSidebar}
            >
              <AiOutlineUnorderedList className="size-5" />
            </IconButton>
          </Tooltip>
        </Flex>
        <Flex align="center" width="100%" justify="center" gap="1">
          <Heading
            size="4"
            style={{
              flex: 'none',
              textAlign: 'center',
              fontWeight: 600,
              letterSpacing: 0.5
            }}
          >
            {currentChatRef?.current?.persona?.name || 'No Persona'}
          </Heading>
        </Flex>
      </Flex>

      {/* API Key Input */}
      <Flex px="4" pt="2" direction="column" gap="2">
        <TextField.Root>
          <TextField.Input
            type="password"
            placeholder="Enter your API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={isLoading}
          />
        </TextField.Root>
      </Flex>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 px-4" type="auto" scrollbars="vertical">
        {conversation.current.map((item, index) => (
          <Message key={index} message={item} />
        ))}
        {currentMessage && <Message message={{ content: currentMessage, role: 'assistant' }} />}
        <div ref={bottomOfChatRef}></div>
      </ScrollArea>

      {/* Input area */}
      <div className="px-4 pb-3">
        {conversation.current.length > 0 && (
          <Flex justify="start" mb="2">
            <Button
              variant="soft"
              color="gray"
              size="2"
              className="rounded-xl cursor-pointer"
              disabled={isLoading}
              onClick={clearMessages}
              tabIndex={0}
              style={{ gap: 8, display: 'flex', alignItems: 'center' }}
            >
              <AiOutlineClear className="size-5" />
              Clear Chat History
            </Button>
          </Flex>
        )}
        <Flex align="end" justify="between" gap="3" className="relative">
          <div className="rt-TextAreaRoot rt-r-size-1 rt-variant-surface flex-1 rounded-3xl chat-textarea">
            <ContentEditable
              innerRef={textAreaRef}
              style={{ minHeight: '24px', maxHeight: '200px', overflowY: 'auto' }}
              className="rt-TextAreaInput text-base"
              html={message}
              disabled={isLoading}
              onChange={(e) => {
                setMessage(sanitizeHtml(e.target.value))
              }}
              onKeyDown={handleKeypress}
            />
            <div className="rt-TextAreaChrome"></div>
          </div>
          <Flex gap="3" className="absolute right-0 pr-4 bottom-2 pt">
            {isLoading ? (
              <Flex
                width="6"
                height="6"
                align="center"
                justify="center"
                style={{ color: 'var(--accent-11)' }}
              >
                <AiOutlineLoading3Quarters className="animate-spin size-5" />
              </Flex>
            ) : (
              <Tooltip content="Send Message">
                <IconButton
                  variant="soft"
                  color="gray"
                  size="2"
                  className="rounded-xl cursor-pointer"
                  onClick={sendMessage}
                >
                  <FiSend className="size-4" />
                </IconButton>
              </Tooltip>
            )}
          </Flex>
        </Flex>
      </div>
    </Flex>
  )
}

export default forwardRef<ChatGPInstance, ChatProps>(Chat)
