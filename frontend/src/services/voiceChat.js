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
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        },
        video: false
      })
      
      this.isEnabled = true
      
      // Log stream details
      const audioTracks = this.localStream.getAudioTracks()
      console.log('✅ [VOICE] Microphone access granted')
      console.log(`🎤 [VOICE] Audio tracks: ${audioTracks.length}`)
      audioTracks.forEach((track, index) => {
        console.log(`🎤 [VOICE] Track ${index}: ${track.kind}, enabled: ${track.enabled}, muted: ${track.muted}`)
      })
      
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
      console.log(`🔗 [VOICE] Reusing existing peer connection for player ${playerId}`)
      return this.peerConnections.get(playerId)
    }

    console.log(`🔗 [VOICE] Creating new peer connection for player ${playerId}`)
    
    const pc = new RTCPeerConnection(this.rtcConfig)
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log(`📤 [VOICE] Adding local track to peer connection:`, track.kind, track.enabled)
        pc.addTrack(track, this.localStream)
      })
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log(`📥 [VOICE] Received remote track from ${playerId}:`, event.track.kind, event.track.enabled)
      const remoteStream = event.streams[0]
      if (remoteStream) {
        console.log(`🔊 [VOICE] Remote stream has ${remoteStream.getTracks().length} tracks`)
        this.playRemoteAudio(playerId, remoteStream)
      }
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        console.log(`🧊 [VOICE] Sending ICE candidate to ${playerId}`)
        this.socket.emit('voice_ice_candidate', {
          lobbyCode: this.lobbyCode,
          targetPlayerId: playerId,
          candidate: event.candidate
        })
      } else if (!event.candidate) {
        console.log(`🧊 [VOICE] ICE gathering complete for ${playerId}`)
      }
    }
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 [VOICE] Connection state with ${playerId}: ${pc.connectionState}`)
      if (pc.connectionState === 'connected') {
        console.log(`✅ [VOICE] Successfully connected to ${playerId}`)
      } else if (pc.connectionState === 'failed') {
        console.error(`❌ [VOICE] Connection failed with ${playerId}`)
      }
    }
    
    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 [VOICE] ICE connection state with ${playerId}: ${pc.iceConnectionState}`)
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
    audio.volume = 1.0
    audio.style.display = 'none'
    
    // Add event listeners for debugging
    audio.onloadedmetadata = () => {
      console.log(`🔊 [VOICE] Audio metadata loaded for player ${playerId}`)
    }
    
    audio.onplay = () => {
      console.log(`▶️ [VOICE] Audio started playing for player ${playerId}`)
    }
    
    audio.onerror = (error) => {
      console.error(`❌ [VOICE] Audio error for player ${playerId}:`, error)
    }
    
    // Force play after a short delay
    setTimeout(() => {
      audio.play().then(() => {
        console.log(`✅ [VOICE] Successfully started audio playback for player ${playerId}`)
      }).catch(error => {
        console.error(`❌ [VOICE] Failed to start audio playback for player ${playerId}:`, error)
      })
    }, 100)
    
    document.body.appendChild(audio)
    
    console.log(`🔊 [VOICE] Created audio element for player ${playerId}, stream tracks:`, stream.getTracks().length)
  }

  // Handle incoming voice offer
  async handleVoiceOffer(data) {
    const { fromPlayerId, fromPlayerName, offer } = data
    
    if (!this.isEnabled) {
      console.log(`🔇 [VOICE] Ignoring voice offer from ${fromPlayerName} - voice chat disabled`)
      return
    }
    
    console.log(`📞 [VOICE] Received voice offer from ${fromPlayerName} (${fromPlayerId})`)
    
    try {
      const pc = await this.createPeerConnection(fromPlayerId)
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      })
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
    
    console.log(`📞 [VOICE] Received voice answer from ${fromPlayerName} (${fromPlayerId})`)
    
    try {
      const pc = this.peerConnections.get(fromPlayerId)
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
        console.log(`✅ [VOICE] Voice connection established with ${fromPlayerName}`)
      } else {
        console.warn(`⚠️ [VOICE] No peer connection found for ${fromPlayerName}`)
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
      
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      })
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

  // Test local audio (for debugging)
  testLocalAudio() {
    if (!this.localStream) {
      console.log('❌ [VOICE] No local stream available for testing')
      return
    }
    
    console.log('🧪 [VOICE] Testing local audio...')
    
    // Create a temporary audio element to test local stream
    const testAudio = document.createElement('audio')
    testAudio.srcObject = this.localStream
    testAudio.muted = false // Don't mute for testing (will cause feedback)
    testAudio.volume = 0.1 // Very low volume to avoid feedback
    testAudio.autoplay = true
    testAudio.style.display = 'none'
    
    testAudio.onplay = () => {
      console.log('✅ [VOICE] Local audio test started')
      // Remove test audio after 2 seconds
      setTimeout(() => {
        testAudio.remove()
        console.log('🧪 [VOICE] Local audio test completed')
      }, 2000)
    }
    
    document.body.appendChild(testAudio)
  }

  // Get current state
  getState() {
    return {
      isEnabled: this.isEnabled,
      isMuted: this.isMuted,
      connectedPlayers: Array.from(this.peerConnections.keys()),
      localStreamTracks: this.localStream ? this.localStream.getTracks().length : 0
    }
  }
}

// Create singleton instance
const voiceChatService = new VoiceChatService()

export default voiceChatService