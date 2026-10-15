// ===== AI CHAT MODULE =====
const AIChat = {
  conversationHistory: [],
  isTyping: false,

  async sendMessage(messageText = null) {
    if (this.isTyping) return;

    const input = document.getElementById('ai-input');
    const msg = messageText || input?.value?.trim();
    if (!msg) return;

    if (input) input.value = '';

    this.addMessage(msg, 'user');
    this.conversationHistory.push({ role: 'user', content: msg });

    try {
      this.showTyping(); // Munculkan spinner loading elegan

      let fullText = "";

      const response = await fetch(SLOPEX_CONFIG.API_BASE + '/ai/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + AppState.token
        },
        body: JSON.stringify({
          message: msg,
          conversationHistory: this.conversationHistory.slice(-8)
        })
      });

      if (!response.ok) {
        this.hideTyping();
        if (response.status === 429) throw new Error('Terlalu banyak permintaan. Coba sesaat lagi.');
        throw new Error('HTTP Error: ' + response.status);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let streamContentEl = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Begitu kata pertama datang dari mesin, hapus spinner dan buat gelembung pesan
        if (!streamContentEl) {
          this.hideTyping();
          streamContentEl = this.addStreamingMessage('', 'ai');
        }
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        
        if (streamContentEl) {
          // Render teks secara langsung tanpa kursor jelek
          streamContentEl.innerHTML = this.formatMarkdown(fullText);
        }
        
        const container = document.getElementById('ai-messages');
        if (container) container.scrollTop = container.scrollHeight;
      }
      
      this.conversationHistory.push({ role: 'assistant', content: fullText });

    } catch (e) {
      this.hideTyping();
      this.addMessage('Koneksi gagal: ' + e.message, 'ai', true);
    }
  },

  addStreamingMessage(text, type) {
    const container = document.getElementById('ai-messages');
    if (!container) return null;

    const el = document.createElement('div');
    el.className = 'chat-message ' + type;
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    el.innerHTML = `
      <div class="ai-avatar" style="width:32px;height:32px;font-size:14px;flex-shrink:0">
        <i class="fas fa-robot"></i>
      </div>
      <div>
        <div class="chat-bubble js-stream-content">
          <i class="fas fa-circle-notch fa-spin" style="color:var(--blue-medium)"></i>
        </div>
        <div class="chat-msg-time">${now}</div>
      </div>
    `;

    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    
    return el.querySelector('.js-stream-content');
  },

  addMessage(text, type, isError = false) {
    const container = document.getElementById('ai-messages');
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'chat-message ' + type;
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (type === 'ai') {
      el.innerHTML = `
        <div class="ai-avatar" style="width:32px;height:32px;font-size:14px;flex-shrink:0">
          <i class="fas fa-robot"></i>
        </div>
        <div>
          <div class="chat-bubble" style="${isError ? 'border-left: 3px solid var(--danger);' : ''}">
            ${this.formatMarkdown(text)}
          </div>
          <div class="chat-msg-time">${now}</div>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div>
          <div class="chat-bubble">${text}</div>
          <div class="chat-msg-time" style="text-align:right">${now}</div>
        </div>
      `;
    }

    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  },

  showTyping() {
    this.isTyping = true;
    const container = document.getElementById('ai-messages');
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'chat-message ai';
    el.id = 'typing-indicator';
    el.innerHTML = `
      <div class="ai-avatar" style="width:32px;height:32px;font-size:14px;flex-shrink:0">
        <i class="fas fa-robot"></i>
      </div>
      <div class="chat-bubble" style="color:var(--text-muted);font-size:13px">
        <i class="fas fa-spinner fa-spin" style="margin-right:8px"></i>
        Menganalisis data sensor dengan Llama 3.2 AI...
      </div>
    `;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  },

  hideTyping() {
    this.isTyping = false;
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  },

  // Format markdown dasar dari AI response
  formatMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      .replace(/(\d+\))/g, '<br>$1');
  },

  // Quick question templates
  askQuick(type) {
    const questions = {
      risiko: 'Bagaimana kondisi risiko longsor saat ini? Analisis semua data sensor.',
      drainase: 'Apakah drainase perlu diaktifkan sekarang? Berikan rekomendasi.',
      prediksi: 'Prediksi kondisi lereng 6 jam ke depan berdasarkan tren data.',
      sp: 'Jelaskan metode Self-Potential (SP) dan bagaimana menginterpretasinya.',
      interpretasi: 'Berikan interpretasi geofisika lengkap kondisi lereng saat ini.'
    };

    const msg = questions[type] || type;
    this.sendMessage(msg);

    // Switch ke halaman AI jika belum
    App.switchPage('ai');
  },

  clearChat() {
    const container = document.getElementById('ai-messages');
    if (container) {
      container.innerHTML = '';
      this.conversationHistory = [];
      // Tampilkan pesan awal yang dipersonalisasi
      const name = AppState.user?.name?.split(' ')[0] || 'Pengguna';
      this.addMessage(`Halo, ${name}! 👋 Saya SLOPEX AI. Saya dapat menganalisis data sensor real-time dan memberikan rekomendasi mitigasi lereng/longsor. Apa yang ingin kamu ketahui hari ini?`, 'ai');
    }
  }
};

// Handle Enter key di input
function handleAIKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    AIChat.sendMessage();
  }
}
