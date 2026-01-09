class VoiceChatService {
  constructor() {
    this.localStream = null
    this.peerConnections = new Map() // playerId -> RTCPeerConnection
    this.socket = null
    this.lobbyCode = null
    this.isEnabled = false
    this.isMuted = false
    
    // WebRTC configuration
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  }

  // Initialize voice chat
  async initialize(socket, lobbyCode) {
    this.socket = socket
    this.lobbyCode = lobbyCode
    
    // Set up socket event listeners
    this.setupSocketListeners()
    
    console.log('🎤 [VOICE] Voice chat service initialized')
  }

  // Setup socket event listeners for WebRTC signaling
  setupSocketListeners() {
    if (!this.socket) return

    this.socket.on('voice_offer', this.handleVoiceOffer.bind(this))
    this.socket.on('voice_answer', this.handleVoiceAnswer.bind(this))
    this.socket.on('voice_ice_candidate', this.handleVoiceIceCandidate.bind(this))
    this.socket.on('player_voice_toggle', this.handlePlayerVoiceToggle.bind(this))
  }

  // Enable voice chat (get microphone access)
  async enable() {
    try {
      console.log('🎤 [VOICE] Requesting microphone access...')
      
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      })
      
      this.isEnabled = true
      console.log('✅ [VOICE] Microphone access granted')
      
      // Create peer connections for existing players
      await this.createPeerConnections()
      
      return true
    } catch (error) {
      console.error('❌ [VOICE] Failed to get microphone access:', error)
      throw new Error('Microphone access denied. Please allow microphone access to use voice chat.')
    }
  }

  // Disable voice chat
  async disable() {
    console.log('🔇 [VOICE] Disabling voice chat...')
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }
    
    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close())
    this.peerConnections.clear()
    
    this.isEnabled = false
    console.log('✅ [VOICE] Voice chat disabled')
  }

  // Toggle mute/unmute
  toggleMute() {
    if (!this.localStream) return false
    
    const audioTrack = this.localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      this.isMuted = !audioTrack.enabled
      
      // Notify other players
      if (this.socket) {
        this.socket.emit('voice_toggle', {
          lobbyCode: this.lobbyCode,
          isMuted: this.isMuted
        })
      }
      
      console.log(`🎤 [VOICE] ${this.isMuted ? 'Muted' : 'Unmuted'}`)
      return this.isMuted
    }
    
    return false
  }

  // Create peer connections for all players
  async createPeerConnections() {
    // This would be called when joining a lobby with existing players
    // For now, we'll create connections when we receive offers
  }

  // Create peer connection for a specific player
  async createPeerConnection(playerId) {
    if (this.peerConnections.has(playerId)) {
      return this.peerConnections.get(playerId)
    }

    console.log(`🔗 [VOICE] Creating peer connection for player ${playerId}`)
    
    const pc = new RTCPeerConnection(this.rtcConfig)
    
    // Add local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream)
      })
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log(`🔊 [VOICE] Received remote stream from ${playerId}`)
      const remoteStream = event.streams[0]
      this.playRemoteAudio(playerId, remoteStream)
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('voice_ice_candidate', {
          lobbyCode: this.lobbyCode,
          targetPlayerId: playerId,
          candidate: event.candidate
        })
      }
    }
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 [VOICE] Connection state with ${playerId}: ${pc.connectionState}`)
    }
    
    this.peerConnections.set(playerId, pc)
    return pc
  }

  // Play remote audio stream
  playRemoteAudio(playerId, stream) {
    // Remove existing audio element if any
    const existingAudio = document.getElementById(`voice-${playerId}`)
    if (existingAudio) {
      existingAudio.remove()
    }
    
    // Create new audio element
    const audio = document.createElement('audio')
    audio.id = `voice-${playerId}`
    audio.srcObject = stream
    audio.autoplay = true
    audio.style.display = 'none'
    
    document.body.appendChild(audio)
    
    console.log(`🔊 [VOICE] Playing audio for player ${playerId}`)
  }

  // Handle incoming voice offer
  async handleVoiceOffer(data) {
    const { fromPlayerId, fromPlayerName, offer } = data
    
    if (!this.isEnabled) {
      console.log(`🔇 [VOICE] Ignoring voice offer from ${fromPlayerName} - voice chat disabled`)
      return
    }
    
    console.log(`📞 [VOICE] Received voice offer from ${fromPlayerName}`)
    
    try {
      const pc = await this.createPeerConnection(fromPlayerId)
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      
      // Send answer back
      this.socket.emit('voice_answer', {
        lobbyCode: this.lobbyCode,
        targetPlayerId: fromPlayerId,
        answer: answer
      })
      
      console.log(`📞 [VOICE] Sent voice answer to ${fromPlayerName}`)
    } catch (error) {
      console.error(`❌ [VOICE] Failed to handle voice offer from ${fromPlayerName}:`, error)
    }
  }

  // Handle incoming voice answer
  async handleVoiceAnswer(data) {
    const { fromPlayerId, fromPlayerName, answer } = data
    
    console.log(`📞 [VOICE] Received voice answer from ${fromPlayerName}`)
    
    try {
      const pc = this.peerConnections.get(fromPlayerId)
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
        console.log(`✅ [VOICE] Voice connection established with ${fromPlayerName}`)
      }
    } catch (error) {
      console.error(`❌ [VOICE] Failed to handle voice answer from ${fromPlayerName}:`, error)
    }
  }

  // Handle incoming ICE candidate
  async handleVoiceIceCandidate(data) {
    const { fromPlayerId, candidate } = data
    
    try {
      const pc = this.peerConnections.get(fromPlayerId)
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
    } catch (error) {
      console.error(`❌ [VOICE] Failed to add ICE candidate:`, error)
    }
  }

  // Handle player voice toggle
  handlePlayerVoiceToggle(data) {
    const { playerId, playerName, isMuted } = data
    console.log(`🎤 [VOICE] ${playerName} ${isMuted ? 'muted' : 'unmuted'} their microphone`)
    
    // You could show visual indicators here
    // For example, update UI to show muted players
  }

  // Initiate voice call with another player
  async initiateCall(targetPlayerId) {
    if (!this.isEnabled) {
      throw new Error('Voice chat is not enabled')
    }
    
    console.log(`📞 [VOICE] Initiating call with player ${targetPlayerId}`)
    
    try {
      const pc = await this.createPeerConnection(targetPlayerId)
      
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      
      // Send offer
      this.socket.emit('voice_offer', {
        lobbyCode: this.lobbyCode,
        targetPlayerId: targetPlayerId,
        offer: offer
      })
      
      console.log(`📞 [VOICE] Sent voice offer to player ${targetPlayerId}`)
    } catch (error) {
      console.error(`❌ [VOICE] Failed to initiate call with player ${targetPlayerId}:`, error)
      throw error
    }
  }

  // Remove player connection
  removePlayer(playerId) {
    const pc = this.peerConnections.get(playerId)
    if (pc) {
      pc.close()
      this.peerConnections.delete(playerId)
      
      // Remove audio element
      const audio = document.getElementById(`voice-${playerId}`)
      if (audio) {
        audio.remove()
      }
      
      console.log(`🔇 [VOICE] Removed voice connection for player ${playerId}`)
    }
  }

  // Cleanup
  cleanup() {
    console.log('🧹 [VOICE] Cleaning up voice chat service')
    
    this.disable()
    
    if (this.socket) {
      this.socket.off('voice_offer')
      this.socket.off('voice_answer')
      this.socket.off('voice_ice_candidate')
      this.socket.off('player_voice_toggle')
    }
  }

  // Get current state
  getState() {
    return {
      isEnabled: this.isEnabled,
      isMuted: this.isMuted,
      connectedPlayers: Array.from(this.peerConnections.keys())
    }
  }
}

// Create singleton instance
const voiceChatService = new VoiceChatService()

export default voiceChatService