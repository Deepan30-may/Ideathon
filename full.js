import { useState, useEffect, useRef } from 'react'
import { Button } from "/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "/components/ui/card"
import { Input } from "/components/ui/input"
import { Label } from "/components/ui/label"
import { Check, Trash, Plus, LogOut, LogIn, Bell, Clock, User, Fingerprint, Image, Mic, Video, X, Pin, Sun, Moon } from "lucide-react"
import { format, parseISO, isBefore } from 'date-fns'

type User = {
  id: string
  email: string
  password: string
  faceAuthEnabled?: boolean
  faceAuthCredentialId?: string
  themePreference?: 'light' | 'dark'
}

type MediaAttachment = {
  type: 'image' | 'audio' | 'video'
  url: string
  name: string
}

type Note = {
  id: string
  userId: string
  title: string
  content: string
  media?: MediaAttachment[]
  createdAt: Date
  isPinned?: boolean
}

type Todo = {
  id: string
  userId: string
  title: string
  completed: boolean
  createdAt: Date
  reminder?: Date
}

export default function NoteApp() {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [faceAuthSupported, setFaceAuthSupported] = useState(false)
  const [showFaceAuthOption, setShowFaceAuthOption] = useState(false)

  // Notes state
  const [notes, setNotes] = useState<Note[]>([])
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [mediaAttachments, setMediaAttachments] = useState<MediaAttachment[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Todos state
  const [todos, setTodos] = useState<Todo[]>([])
  const [todoTitle, setTodoTitle] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [reminderTime, setReminderTime] = useState('')
  const [showReminderForm, setShowReminderForm] = useState(false)

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Apply theme class to body
  useEffect(() => {
    document.body.className = theme
  }, [theme])

  // Check if WebAuthn is supported
  useEffect(() => {
    if (window.PublicKeyCredential && 
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(result => {
          setFaceAuthSupported(result)
        })
        .catch(() => setFaceAuthSupported(false))
    }
  }, [])

  // Load data from localStorage on initial render
  useEffect(() => {
    const users = JSON.parse(localStorage.getItem('users') || '[]')
    const notes = JSON.parse(localStorage.getItem('notes') || '[]')
    const todos = JSON.parse(localStorage.getItem('todos') || '[]')
    const currentUserId = localStorage.getItem('currentUserId')

    if (currentUserId) {
      const user = users.find((u: User) => u.id === currentUserId)
      if (user) {
        setCurrentUser(user)
        setNotes(notes.filter((n: Note) => n.userId === user.id))
        setTodos(todos.filter((t: Todo) => t.userId === user.id))
        setTheme(user.themePreference || 'light')
      }
    }
  }, [])

  // Check for upcoming reminders
  useEffect(() => {
    if (!currentUser) return

    const checkReminders = () => {
      const now = new Date()
      todos.forEach(todo => {
        if (todo.reminder && !todo.completed && isBefore(todo.reminder, now)) {
          alert(Reminder: ${todo.title})
          // Mark as completed or remove reminder after alert
          const updatedTodos = todos.map(t => 
            t.id === todo.id ? { ...t, reminder: undefined } : t
          )
          localStorage.setItem('todos', JSON.stringify(updatedTodos))
          setTodos(updatedTodos.filter(t => t.userId === currentUser.id))
        }
      })
    }

    const interval = setInterval(checkReminders, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [todos, currentUser])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUserId', currentUser.id)
    }
  }, [currentUser])

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    
    if (currentUser) {
      const users = JSON.parse(localStorage.getItem('users') || '[]')
      const updatedUsers = users.map((u: User) => 
        u.id === currentUser.id ? { ...u, themePreference: newTheme } : u
      )
      localStorage.setItem('users', JSON.stringify(updatedUsers))
      setCurrentUser(updatedUsers.find((u: User) => u.id === currentUser.id))
    }
  }

  // Register face authentication
  const registerFaceAuth = async () => {
    try {
      // Generate a random challenge (this would normally come from your server)
      const challenge = new Uint8Array(32)
      window.crypto.getRandomValues(challenge)
      
      const publicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "Note Taking App",
          id: window.location.hostname,
        },
        user: {
          id: new Uint8Array(16),
          name: currentUser!.email,
          displayName: currentUser!.email,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },  // ES256
          { type: "public-key", alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "direct"
      }

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential

      if (credential) {
        // In a real app, you would send this to your server for verification
        // For our demo, we'll just store the credential ID locally
        const users = JSON.parse(localStorage.getItem('users') || '[]')
        const updatedUsers = users.map((u: User) => 
          u.id === currentUser!.id 
            ? { 
                ...u, 
                faceAuthEnabled: true,
                faceAuthCredentialId: credential.id 
              } 
            : u
        )
        localStorage.setItem('users', JSON.stringify(updatedUsers))
        setCurrentUser(updatedUsers.find((u: User) => u.id === currentUser!.id))
        alert('Face authentication successfully registered!')
      }
    } catch (error) {
      console.error('Face registration error:', error)
      alert('Failed to register face authentication. Please try again.')
    }
  }

  // Authenticate with face
  const authenticateWithFace = async () => {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]')
      const user = users.find((u: User) => u.email === email)
      
      if (!user || !user.faceAuthEnabled) {
        setAuthError('Face authentication not set up for this account')
        return
      }

      // Generate a random challenge (this would normally come from your server)
      const challenge = new Uint8Array(32)
      window.crypto.getRandomValues(challenge)

      const publicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [{
          id: Uint8Array.from(user.faceAuthCredentialId, c => c.charCodeAt(0)),
          type: 'public-key',
          transports: ['internal'],
        }],
        userVerification: 'required',
        timeout: 60000,
      }

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential

      if (assertion) {
        // In a real app, you would verify the assertion with your server
        // For our demo, we'll just consider it successful
        setCurrentUser(user)
        // Load user-specific data
        const notes = JSON.parse(localStorage.getItem('notes') || '[]')
        const todos = JSON.parse(localStorage.getItem('todos') || '[]')
        setNotes(notes.filter((n: Note) => n.userId === user.id))
        setTodos(todos.filter((t: Todo) => t.userId === user.id))
        setTheme(user.themePreference || 'light')
      }
    } catch (error) {
      console.error('Face authentication error:', error)
      setAuthError('Face authentication failed. Please try again or use password.')
    }
  }

  // Authentication functions
  const handleAuth = () => {
    setAuthError('')
    const users = JSON.parse(localStorage.getItem('users') || '[]')

    if (authMode === 'login') {
      const user = users.find((u: User) => u.email === email && u.password === password)
      if (user) {
        setCurrentUser(user)
        // Load user-specific data
        const notes = JSON.parse(localStorage.getItem('notes') || '[]')
        const todos = JSON.parse(localStorage.getItem('todos') || '[]')
        setNotes(notes.filter((n: Note) => n.userId === user.id))
        setTodos(todos.filter((t: Todo) => t.userId === user.id))
        setShowFaceAuthOption(user.faceAuthEnabled)
        setTheme(user.themePreference || 'light')
      } else {
        setAuthError('Invalid email or password')
      }
    } else {
      if (users.some((u: User) => u.email === email)) {
        setAuthError('Email already exists')
        return
      }
      const newUser = {
        id: Date.now().toString(),
        email,
        password,
        themePreference: 'light'
      }
      const updatedUsers = [...users, newUser]
      localStorage.setItem('users', JSON.stringify(updatedUsers))
      setCurrentUser(newUser)
      setAuthMode('login')
    }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem('currentUserId')
    setNotes([])
    setTodos([])
    setShowFaceAuthOption(false)
  }

  // Media handling functions
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newAttachments: MediaAttachment[] = []
    
    Array.from(files).forEach(file => {
      const fileType = file.type.split('/')[0]
      if (['image', 'audio', 'video'].includes(fileType)) {
        const url = URL.createObjectURL(file)
        newAttachments.push({
          type: fileType as 'image' | 'audio' | 'video',
          url,
          name: file.name
        })
      }
    })

    setMediaAttachments([...mediaAttachments, ...newAttachments])
  }

  const removeMedia = (index: number) => {
    const newAttachments = [...mediaAttachments]
    URL.revokeObjectURL(newAttachments[index].url)
    newAttachments.splice(index, 1)
    setMediaAttachments(newAttachments)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        const audioUrl = URL.createObjectURL(audioBlob)
        setMediaAttachments([...mediaAttachments, {
          type: 'audio',
          url: audioUrl,
          name: Recording-${new Date().toISOString()}.wav
        }])
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Failed to access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  // Note functions
  const saveNote = () => {
    if (!noteTitle.trim() && mediaAttachments.length === 0) return

    const notes = JSON.parse(localStorage.getItem('notes') || '[]')
    let updatedNotes

    if (editingNoteId) {
      updatedNotes = notes.map((n: Note) => 
        n.id === editingNoteId 
          ? { 
              ...n, 
              title: noteTitle, 
              content: noteContent,
              media: mediaAttachments
            } 
          : n
      )
    } else {
      const newNote: Note = {
        id: Date.now().toString(),
        userId: currentUser!.id,
        title: noteTitle,
        content: noteContent,
        media: mediaAttachments,
        createdAt: new Date(),
        isPinned: false
      }
      updatedNotes = [...notes, newNote]
    }

    localStorage.setItem('notes', JSON.stringify(updatedNotes))
    setNotes(updatedNotes.filter((n: Note) => n.userId === currentUser!.id))
    setNoteTitle('')
    setNoteContent('')
    setMediaAttachments([])
    setEditingNoteId(null)
  }

  const editNote = (note: Note) => {
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setMediaAttachments(note.media || [])
    setEditingNoteId(note.id)
  }

  const deleteNote = (id: string) => {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]')
    const noteToDelete = notes.find((n: Note) => n.id === id)
    
    // Clean up media URLs
    if (noteToDelete?.media) {
      noteToDelete.media.forEach((media: MediaAttachment) => {
        URL.revokeObjectURL(media.url)
      })
    }

    const updatedNotes = notes.filter((n: Note) => n.id !== id)
    localStorage.setItem('notes', JSON.stringify(updatedNotes))
    setNotes(updatedNotes.filter((n: Note) => n.userId === currentUser!.id))
  }

  const togglePinNote = (id: string) => {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]')
    const noteToPin = notes.find((n: Note) => n.id === id)
    
    // Count currently pinned notes
    const pinnedCount = notes.filter((n: Note) => 
      n.userId === currentUser!.id && n.isPinned && n.id !== id
    ).length

    if (noteToPin.isPinned || pinnedCount < 3) {
      const updatedNotes = notes.map((n: Note) => 
        n.id === id ? { ...n, isPinned: !n.isPinned } : n
      )
      localStorage.setItem('notes', JSON.stringify(updatedNotes))
      setNotes(updatedNotes.filter((n: Note) => n.userId === currentUser!.id))
    } else {
      alert('You can pin a maximum of 3 notes')
    }
  }

  // Todo functions
  const addTodo = () => {
    if (!todoTitle.trim()) return

    const todos = JSON.parse(localStorage.getItem('todos') || '[]')
    const newTodo: Todo = {
      id: Date.now().toString(),
      userId: currentUser!.id,
      title: todoTitle,
      completed: false,
      createdAt: new Date()
    }

    if (showReminderForm && reminderDate && reminderTime) {
      const reminderDateTime = new Date(${reminderDate}T${reminderTime})
      if (!isNaN(reminderDateTime.getTime())) {
        newTodo.reminder = reminderDateTime
      }
    }

    const updatedTodos = [...todos, newTodo]
    localStorage.setItem('todos', JSON.stringify(updatedTodos))
    setTodos(updatedTodos.filter((t: Todo) => t.userId === currentUser!.id))
    setTodoTitle('')
    setReminderDate('')
    setReminderTime('')
    setShowReminderForm(false)
  }

  const toggleReminderForm = () => {
    setShowReminderForm(!showReminderForm)
    if (!showReminderForm) {
      // Set default reminder time to now + 1 hour
      const now = new Date()
      now.setHours(now.getHours() + 1)
      setReminderDate(format(now, 'yyyy-MM-dd'))
      setReminderTime(format(now, 'HH:mm'))
    }
  }

  // Sort notes with pinned notes first
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">
              {authMode === 'login' ? 'Login' : 'Sign Up'}
            </CardTitle>
            <CardDescription>
              {authMode === 'login' 
                ? 'Enter your credentials to access your notes'
                : 'Create an account to get started'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            
            {authMode === 'login' && showFaceAuthOption ? (
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  onClick={authenticateWithFace}
                >
                  <Fingerprint className="mr-2 h-4 w-4" />
                  Sign in with Face
                </Button>
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink mx-4 text-gray-500">or</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
              </div>
            ) : null}

            {authMode !== 'login' || !showFaceAuthOption ? (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            ) : null}

            {authError && <p className="text-red-500 text-sm">{authError}</p>}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button className="w-full" onClick={handleAuth}>
              {authMode === 'login' ? (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Sign Up
                </>
              )}
            </Button>
            <Button
              variant="link"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login')
                setShowFaceAuthOption(false)
              }}
            >
              {authMode === 'login'
                ? "Don't have an account? Sign up"
                : "Already have an account? Login"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className={min-h-screen ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'}}>
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold dark:text-white">Note Taking App</h1>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleTheme}
              title={Switch to ${theme === 'light' ? 'dark' : 'light'} mode}
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
            {faceAuthSupported && !currentUser.faceAuthEnabled && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={registerFaceAuth}
                title="Enable Face Authentication"
              >
                <Fingerprint className="h-4 w-4" />
              </Button>
            )}
            <span className="text-sm text-gray-600 dark:text-gray-300">{currentUser.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Notes Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold dark:text-white">Notes</h2>
          </div>
          
          <Card className="mb-4 dark:bg-gray-800">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note-title" className="dark:text-white">Title</Label>
                <Input
                  id="note-title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-content" className="dark:text-white">Content</Label>
                <textarea
                  id="note-content"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write your note here..."
                  rows={3}
                />
              </div>

              {/* Media attachments */}
              <div className="space-y-2">
                <Label className="dark:text-white">Attachments</Label>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fileInputRef.current?.click()}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Add Image/Video
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/,video/"
                    multiple
                    className="hidden"
                  />
                  <Button 
                    variant={isRecording ? 'destructive' : 'outline'} 
                    size="sm" 
                    onClick={isRecording ? stopRecording : startRecording}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    {isRecording ? 'Stop Recording' : 'Record Audio'}
                  </Button>
                </div>

                {mediaAttachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {mediaAttachments.map((media, index) => (
                      <div key={index} className="relative border rounded-md p-2 dark:border-gray-600">
                        {media.type === 'image' && (
                          <img 
                            src={media.url} 
                            alt={media.name} 
                            className="w-full h-32 object-cover rounded"
                          />
                        )}
                        {media.type === 'video' && (
                          <video 
                            src={media.url} 
                            controls 
                            className="w-full h-32 object-cover rounded"
                          />
                        )}
                        {media.type === 'audio' && (
                          <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-700 rounded">
                            <audio src={media.url} controls className="w-full" />
                          </div>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="absolute top-1 right-1 p-1 h-6 w-6 dark:text-white"
                          onClick={() => removeMedia(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <p className="text-xs text-gray-500 dark:text-gray-300 truncate mt-1">{media.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={saveNote} className="w-full">
                {editingNoteId ? 'Update Note' : 'Add Note'}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {sortedNotes.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-300 text-center py-4">No notes yet</p>
            ) : (
              sortedNotes.map((note) => (
                <Card key={note.id} className={dark:bg-gray-800 ${note.isPinned ? 'border-2 border-yellow-400 dark:border-yellow-500' : ''}}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg dark:text-white">{note.title}</CardTitle>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePinNote(note.id)}
                          className={note.isPinned ? 'text-yellow-500' : ''}
                        >
                          <Pin className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editNote(note)}
                          className="dark:text-white"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNote(note.id)}
                          className="dark:text-white"
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="text-xs dark:text-gray-300">
                      {new Date(note.createdAt).toLocaleString()}
                      {note.isPinned && (
                        <span className="ml-2 text-yellow-500">Pinned</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {note.content && (
                      <p className="whitespace-pre-line dark:text-white">{note.content}</p>
                    )}
                    {note.media && note.media.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {note.media.map((media, index) => (
                          <div key={index} className="border rounded-md p-2 dark:border-gray-600">
                            {media.type === 'image' && (
                              <img 
                                src={media.url} 
                                alt={media.name} 
                                className="w-full h-32 object-cover rounded"
                              />
                            )}
                            {media.type === 'video' && (
                              <video 
                                src={media.url} 
                                controls 
                                className="w-full h-32 object-cover rounded"
                              />
                            )}
                            {media.type === 'audio' && (
                              <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-700 rounded">
                                <audio src={media.url} controls className="w-full" />
                              </div>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-300 truncate mt-1">{media.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* Todos Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold dark:text-white">To-Do List</h2>
          </div>
          
          <Card className="mb-4 dark:bg-gray-800">
            <CardContent className="p-4 space-y-4">
              <div className="flex space-x-2">
                <Input
                  value={todoTitle}
                  onChange={(e) => setTodoTitle(e.target.value)}
                  placeholder="Add a new task"
                  onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <Button onClick={addTodo}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleReminderForm}
                  className="dark:text-white"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {showReminderForm ? 'Remove Reminder' : 'Add Reminder'}
                </Button>
              </div>

              {showReminderForm && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="dark:text-white">Date</Label>
                    <Input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <Label className="dark:text-white">Time</Label>
                    <Input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            {todos.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-300 text-center py-4">No tasks yet</p>
            ) : (
              todos.map((todo) => (
                <Card key={todo.id} className="dark:bg-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Button
                          variant={todo.completed ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleTodo(todo.id)}
                        >
                          {todo.completed && <Check className="h-4 w-4" />}
                        </Button>
                        <div className="flex flex-col">
                          <span
                            className={${todo.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'dark:text-white'}}
                          >
                            {todo.title}
                          </span>
                          {todo.reminder && (
                            <span className="text-xs text-gray-500 dark:text-gray-300">
                              <Bell className="inline h-3 w-3 mr-1" />
                              {format(new Date(todo.reminder), 'MMM d, h:mm a')}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTodo(todo.id)}
                        className="dark:text-white"
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                      Created: {new Date(todo.createdAt).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
