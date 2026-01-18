/**
 * XAYTHEON - Real-Time Collaboration Logic
 * Handles WebSocket connections, room joining, and live updates
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Basic Setup
    const statusEl = document.getElementById('connection-status');
    const userListEl = document.getElementById('user-list');
    const activityFeedEl = document.getElementById('activity-feed');
    const inviteBtn = document.getElementById('invite-btn');

    // Parse URL params for Room ID
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room') || 'default-workspace';

    document.getElementById('room-id-display').textContent = roomId;

    // 2. Initialize Socket.io
    // Assumes auth.js has already run and set the access_token in localStorage or variable
    // We need to fetch the token from Supabase session usually.
    // For this demo, we'll try to get it from local storage or prompt.
    let token = localStorage.getItem('sb-access-token');

    // Note: In typical Supabase apps, token is in localStorage under specific key
    // We might need a helper to get the actual JWT. 
    // This is a placeholder for obtaining the valid JWT.
    if (!token) {
        // Try generic fallback
        const session = JSON.parse(localStorage.getItem('sb-xaytheon-auth-token'));
        if (session) token = session.access_token;
    }

    if (!token) {
        statusEl.innerHTML = '⚠️ Authentication required to join collaboration.';
        statusEl.style.color = 'var(--accent-color)';
        return;
    }

    // Connect to backend
    const socket = io('http://localhost:5000', {
        auth: { token }
    });

    // 3. Socket Event Listeners

    socket.on('connect', () => {
        statusEl.textContent = '🟢 Connected';
        statusEl.style.color = '#10b981';

        // Join the specific collaboration room
        // We use the same event name as the backend expects, usually "join_room" 
        // OR "join_watchlist" if re-using that logic. 
        // Based on socket.server.js, we have "join_watchlist". 
        // Let's use that if we are treating this as a watchlist collab, 
        // or emit a custom one if we extended the backend.
        // Since we are building a generic collab view, let's assume we extended backend 
        // OR we just map "room" to "watchlist" for this demo.
        socket.emit('join_watchlist', roomId);
    });

    socket.on('connect_error', (err) => {
        statusEl.textContent = '🔴 Connection Failed';
        statusEl.style.color = '#ef4444';
        console.error('Socket error:', err);
    });

    socket.on('user_joined', (data) => {
        addActivity(`${data.userId} joined the room.`);
        refreshUserList(data.userId, 'join');
    });

    socket.on('user_left', (data) => {
        addActivity(`${data.userId} left the room.`);
        refreshUserList(data.userId, 'leave');
    });

    socket.on('presence_update', (data) => {
        // data.viewers is an array of userIds
        renderUserList(data.viewers);
    });

    // Custom events for collaboration (needs backend support)
    socket.on('receive_update', (data) => {
        addActivity(`${data.userId} performed: ${data.action}`);
        // Handle actual data update (e.g., refresh list)
    });

    // 4. UI Interactions

    if (inviteBtn) {
        inviteBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/collab/invite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId })
                });
                const data = await res.json();
                navigator.clipboard.writeText(data.inviteLink);
                alert('Invite link copied to clipboard!');
            } catch (e) {
                console.error(e);
                alert('Failed to create invite link');
            }
        });
    }

    // 5. Helpers

    function renderUserList(userIds) {
        userListEl.innerHTML = '';
        userIds.forEach(uid => {
            const li = document.createElement('li');
            li.className = 'user-item';
            // Simple avatar generation
            li.innerHTML = `
                <div class="user-avatar">${uid.substring(0, 2).toUpperCase()}</div>
                <span>${uid}</span>
                <span class="user-status-dot"></span>
            `;
            userListEl.appendChild(li);
        });
    }

    function refreshUserList(userId, type) {
        // Optimistic update if we don't get full list immediately
        // In a real app, 'presence_update' usually handles the source of truth
    }

    function addActivity(text) {
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
            <span class="activity-time">${new Date().toLocaleTimeString()}</span>
            <span class="activity-text">${text}</span>
        `;
        activityFeedEl.prepend(div);
    }
});
