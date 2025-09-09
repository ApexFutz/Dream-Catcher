// Global variables
let tasks = [];
let currentFilter = 'all';
let taskIdCounter = 1;
let seeds = 0;
let profileId = '';
let friends = [];
let friendRequests = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    generateProfileId();
    updateStats();
    updateSocialStats();
    updateJourneyTree();
    updateMilestones();
    renderTasks();
    renderFriends();
    updateAvatarInitials();
    
    // Add Enter key support for adding tasks
    document.getElementById('new-task').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    
    // Add Enter key support for adding friends
    const friendInput = document.getElementById('friend-id-input');
    if (friendInput) {
        friendInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addFriend();
            }
        });
    }
});

// Page Navigation
function showPage(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    // Show selected page
    document.getElementById(pageId).classList.add('active');
    
    // Update navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update journey tree when switching to journey page
    if (pageId === 'journey') {
        updateJourneyTree();
        updateMilestones();
    }
}

// Profile Management
function saveProfile() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const bio = document.getElementById('bio').value;
    
    // Save to localStorage
    const profile = { username, email, bio };
    localStorage.setItem('todoAppProfile', JSON.stringify(profile));
    
    // Update avatar initials
    updateAvatarInitials();
    
    // Show success message
    showNotification('Profile saved successfully!', 'success');
}

function updateAvatarInitials() {
    const username = document.getElementById('username').value || 'User';
    const initials = username.split(' ')
        .map(name => name.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
    document.getElementById('avatar-initials').textContent = initials;
}

// Task Management
function addTask() {
    const taskInput = document.getElementById('new-task');
    const prioritySelect = document.getElementById('task-priority');
    const taskText = taskInput.value.trim();
    
    if (taskText === '') {
        showNotification('Please enter a task!', 'error');
        return;
    }
    
    const task = {
        id: taskIdCounter++,
        text: taskText,
        priority: prioritySelect.value,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(task);
    
    // Increment seeds when a task is created
    seeds++;
    
    taskInput.value = '';
    prioritySelect.value = 'medium';
    
    saveToLocalStorage();
    renderTasks();
    updateStats();
    updateJourneyTree();
    updateMilestones();
    
    showNotification(`Task added successfully! +1 seed earned! 🌱`, 'success');
}

function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        
        saveToLocalStorage();
        renderTasks();
        updateStats();
        updateJourneyTree();
        updateMilestones();
        
        if (task.completed) {
            showNotification('Task completed! 🎉', 'success');
        }
    }
}

function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(t => t.id !== taskId);
        
        saveToLocalStorage();
        renderTasks();
        updateStats();
        updateJourneyTree();
        updateMilestones();
        
        showNotification('Task deleted!', 'info');
    }
}

function filterTasks(filter) {
    currentFilter = filter;
    
    // Update filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    renderTasks();
}

function renderTasks() {
    const taskList = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');
    
    let filteredTasks = tasks;
    
    // Apply filter
    switch (currentFilter) {
        case 'pending':
            filteredTasks = tasks.filter(task => !task.completed);
            break;
        case 'completed':
            filteredTasks = tasks.filter(task => task.completed);
            break;
        default:
            filteredTasks = tasks;
    }
    
    // Sort tasks: pending first, then by priority, then by creation date
    filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed - b.completed;
        }
        
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    if (filteredTasks.length === 0) {
        taskList.style.display = 'none';
        emptyState.style.display = 'block';
        emptyState.innerHTML = `<p>No ${currentFilter === 'all' ? '' : currentFilter} tasks found.</p>`;
    } else {
        taskList.style.display = 'block';
        emptyState.style.display = 'none';
        
        taskList.innerHTML = filteredTasks.map(task => `
            <li class="task-item ${task.completed ? 'completed' : ''}">
                <input type="checkbox" class="task-checkbox" 
                       ${task.completed ? 'checked' : ''} 
                       onchange="toggleTask(${task.id})">
                <span class="task-text">${escapeHtml(task.text)}</span>
                <span class="task-priority priority-${task.priority}">${task.priority}</span>
                <button class="task-delete" onclick="deleteTask(${task.id})">Delete</button>
            </li>
        `).join('');
    }
}

// Statistics
function updateStats() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    
    document.getElementById('total-tasks').textContent = totalTasks;
    document.getElementById('completed-tasks').textContent = completedTasks;
    document.getElementById('pending-tasks').textContent = pendingTasks;
    document.getElementById('seeds-count').textContent = seeds;
}

// Journey Tree Visualization
function updateJourneyTree() {
    const completedTasks = tasks.filter(task => task.completed).length;
    const branchesContainer = document.getElementById('tree-branches');
    const leavesContainer = document.getElementById('tree-leaves');
    
    // Clear existing branches and leaves
    branchesContainer.innerHTML = '';
    leavesContainer.innerHTML = '';
    
    // Add branches and leaves based on completed tasks
    const maxBranches = 8;
    const branchCount = Math.min(Math.ceil(completedTasks / 2), maxBranches);
    
    for (let i = 0; i < branchCount; i++) {
        // Create branch
        const branch = document.createElement('div');
        branch.className = 'branch';
        
        const angle = (i - branchCount / 2) * 30; // Spread branches
        const length = 30 + Math.random() * 20;
        
        branch.style.width = `${length}px`;
        branch.style.height = '4px';
        branch.style.transform = `rotate(${angle}deg)`;
        branch.style.left = `${-length/2}px`;
        branch.style.bottom = `${i * 10}px`;
        
        branchesContainer.appendChild(branch);
        
        // Add leaves to branches
        const leavesOnBranch = Math.min(Math.floor(completedTasks / branchCount), 3);
        for (let j = 0; j < leavesOnBranch; j++) {
            const leaf = document.createElement('div');
            leaf.className = 'leaf';
            
            const leafX = Math.cos(angle * Math.PI / 180) * (length * 0.7) + (Math.random() - 0.5) * 20;
            const leafY = Math.sin(angle * Math.PI / 180) * (length * 0.7) + i * 10 + (Math.random() - 0.5) * 10;
            
            leaf.style.left = `${leafX}px`;
            leaf.style.bottom = `${leafY + 20}px`;
            leaf.style.animationDelay = `${Math.random() * 3}s`;
            
            leavesContainer.appendChild(leaf);
        }
    }
}

// Milestone Management
function updateMilestones() {
    const completedTasks = tasks.filter(task => task.completed).length;
    const milestones = [
        { id: 1, count: 1, element: 'milestone-1' },
        { id: 5, count: 5, element: 'milestone-5' },
        { id: 10, count: 10, element: 'milestone-10' },
        { id: 25, count: 25, element: 'milestone-25' }
    ];
    
    milestones.forEach(milestone => {
        const element = document.getElementById(milestone.element);
        const milestoneDiv = element.closest('.milestone');
        
        if (completedTasks >= milestone.count) {
            element.textContent = 'Achieved!';
            element.classList.add('achieved');
            milestoneDiv.classList.add('achieved');
        } else {
            element.textContent = 'Not Achieved';
            element.classList.remove('achieved');
            milestoneDiv.classList.remove('achieved');
        }
    });
}

// Social Features
function generateProfileId() {
    // Check if profile ID already exists
    const savedProfileId = localStorage.getItem('todoAppProfileId');
    if (savedProfileId) {
        profileId = savedProfileId;
    } else {
        // Generate a unique 8-character profile ID
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        profileId = '';
        for (let i = 0; i < 8; i++) {
            profileId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        localStorage.setItem('todoAppProfileId', profileId);
    }
    
    // Display profile ID
    const profileIdInput = document.getElementById('profile-id');
    if (profileIdInput) {
        profileIdInput.value = profileId;
    }
}

function copyProfileId() {
    const profileIdInput = document.getElementById('profile-id');
    if (profileIdInput) {
        profileIdInput.select();
        document.execCommand('copy');
        showNotification('Profile ID copied to clipboard!', 'success');
    }
}

function addFriend() {
    const friendIdInput = document.getElementById('friend-id-input');
    const friendId = friendIdInput.value.trim().toUpperCase();
    
    if (!friendId) {
        showNotification('Please enter a friend\'s Profile ID!', 'error');
        return;
    }
    
    if (friendId === profileId) {
        showNotification('You cannot add yourself as a friend!', 'error');
        return;
    }
    
    if (friends.some(friend => friend.id === friendId)) {
        showNotification('This user is already your friend!', 'error');
        return;
    }
    
    // Create mock friend data (in a real app, this would fetch from server)
    const mockNames = ['Alex Johnson', 'Sarah Wilson', 'Mike Chen', 'Emma Davis', 'Chris Brown', 'Lisa Garcia'];
    const mockBios = ['Productivity enthusiast', 'Goal crusher', 'Dream chaser', 'Task master', 'Achievement hunter'];
    
    const newFriend = {
        id: friendId,
        name: mockNames[Math.floor(Math.random() * mockNames.length)],
        bio: mockBios[Math.floor(Math.random() * mockBios.length)],
        status: Math.random() > 0.5 ? 'online' : 'offline',
        tasksCompleted: Math.floor(Math.random() * 50),
        seeds: Math.floor(Math.random() * 100),
        addedAt: new Date().toISOString()
    };
    
    friends.push(newFriend);
    friendIdInput.value = '';
    
    saveSocialToLocalStorage();
    renderFriends();
    updateSocialStats();
    addActivity(`👥 Added ${newFriend.name} as a friend!`);
    
    showNotification(`${newFriend.name} added as friend!`, 'success');
}

function removeFriend(friendId) {
    if (confirm('Are you sure you want to remove this friend?')) {
        const friend = friends.find(f => f.id === friendId);
        friends = friends.filter(f => f.id !== friendId);
        
        saveSocialToLocalStorage();
        renderFriends();
        updateSocialStats();
        
        if (friend) {
            addActivity(`👋 Removed ${friend.name} from friends`);
            showNotification(`${friend.name} removed from friends`, 'info');
        }
    }
}

function renderFriends() {
    const friendsList = document.getElementById('friends-list');
    const noFriends = document.getElementById('no-friends');
    
    if (!friendsList) return;
    
    if (friends.length === 0) {
        friendsList.style.display = 'none';
        noFriends.style.display = 'block';
    } else {
        friendsList.style.display = 'block';
        noFriends.style.display = 'none';
        
        friendsList.innerHTML = friends.map(friend => `
            <div class="friend-item">
                <div class="friend-avatar">
                    ${friend.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2)}
                </div>
                <div class="friend-info">
                    <div class="friend-name">${escapeHtml(friend.name)}</div>
                    <div class="friend-status ${friend.status}">${friend.status}</div>
                    <div class="friend-stats">
                        <span>🎯 ${friend.tasksCompleted} tasks</span>
                        <span>🌱 ${friend.seeds} seeds</span>
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="btn btn-small btn-secondary" onclick="viewFriendProfile('${friend.id}')">View</button>
                    <button class="btn btn-small btn-danger" onclick="removeFriend('${friend.id}')">Remove</button>
                </div>
            </div>
        `).join('');
    }
}

function viewFriendProfile(friendId) {
    const friend = friends.find(f => f.id === friendId);
    if (friend) {
        showNotification(`Viewing ${friend.name}'s profile (feature coming soon!)`, 'info');
    }
}

function updateSocialStats() {
    const friendsCountElement = document.getElementById('friends-count');
    const friendRequestsElement = document.getElementById('friend-requests');
    
    if (friendsCountElement) {
        friendsCountElement.textContent = friends.length;
    }
    
    if (friendRequestsElement) {
        friendRequestsElement.textContent = friendRequests.length;
    }
}

function addActivity(text) {
    const activityFeed = document.getElementById('activity-feed');
    if (!activityFeed) return;
    
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = `
        <span class="activity-icon">🎉</span>
        <span class="activity-text">${escapeHtml(text)}</span>
        <span class="activity-time">Just now</span>
    `;
    
    // Add to top of feed
    activityFeed.insertBefore(activityItem, activityFeed.firstChild);
    
    // Keep only last 10 activities
    while (activityFeed.children.length > 10) {
        activityFeed.removeChild(activityFeed.lastChild);
    }
}

// Local Storage Management
function saveToLocalStorage() {
    localStorage.setItem('todoAppTasks', JSON.stringify(tasks));
    localStorage.setItem('todoAppTaskCounter', taskIdCounter.toString());
    localStorage.setItem('todoAppSeeds', seeds.toString());
}

function saveSocialToLocalStorage() {
    localStorage.setItem('todoAppFriends', JSON.stringify(friends));
    localStorage.setItem('todoAppFriendRequests', JSON.stringify(friendRequests));
}

function loadFromLocalStorage() {
    // Load tasks
    const savedTasks = localStorage.getItem('todoAppTasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    }
    
    // Load task counter
    const savedCounter = localStorage.getItem('todoAppTaskCounter');
    if (savedCounter) {
        taskIdCounter = parseInt(savedCounter);
    }
    
    // Load seeds
    const savedSeeds = localStorage.getItem('todoAppSeeds');
    if (savedSeeds) {
        seeds = parseInt(savedSeeds);
    }
    
    // Load friends
    const savedFriends = localStorage.getItem('todoAppFriends');
    if (savedFriends) {
        friends = JSON.parse(savedFriends);
    }
    
    // Load friend requests
    const savedFriendRequests = localStorage.getItem('todoAppFriendRequests');
    if (savedFriendRequests) {
        friendRequests = JSON.parse(savedFriendRequests);
    }
    
    // Load profile
    const savedProfile = localStorage.getItem('todoAppProfile');
    if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        document.getElementById('username').value = profile.username || '';
        document.getElementById('email').value = profile.email || '';
        document.getElementById('bio').value = profile.bio || '';
    }
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
            break;
        case 'error':
            notification.style.background = 'linear-gradient(135deg, #dc3545, #fd7e14)';
            break;
        case 'info':
            notification.style.background = 'linear-gradient(135deg, #17a2b8, #6f42c1)';
            break;
        default:
            notification.style.background = 'linear-gradient(135deg, #6c757d, #495057)';
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + N to focus on new task input
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        const newTaskInput = document.getElementById('new-task');
        if (newTaskInput) {
            newTaskInput.focus();
        }
    }
    
    // Escape to clear new task input
    if (e.key === 'Escape') {
        const newTaskInput = document.getElementById('new-task');
        if (newTaskInput && document.activeElement === newTaskInput) {
            newTaskInput.value = '';
            newTaskInput.blur();
        }
    }
});
