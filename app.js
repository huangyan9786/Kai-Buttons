document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audioPlayer');
    const buttonsContainer = document.getElementById('buttonsContainer');
    const statusPanel = document.getElementById('statusPanel');
    const statusText = document.getElementById('statusText');
    const trackNameLabel = document.getElementById('trackName');
    const progressBar = document.getElementById('progressBar');
    
    let currentActiveButton = null;

    // Hardcoded fallback files found in the root directory
    const FALLBACK_MP3_FILES = [
        "MP3/mental real 哭喔.mp3",
        "MP3/好痛苦喔.mp3"
    ];

    /**
     * Scan the directory for MP3 files.
     * Tries to fetch the directory root to dynamically parse file links.
     * Falls back to the hardcoded list on failure.
     */
    async function scanMp3Files() {
        try {
            // Try fetching the MP3 directory (works on HTTP servers that serve directory indices)
            const response = await fetch('./MP3/');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const htmlText = await response.text();
            
            // Check if it looks like an HTML index page
            if (htmlText.includes('<html') || htmlText.includes('<pre>') || htmlText.includes('<ul')) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');
                const links = Array.from(doc.querySelectorAll('a'));
                
                const foundMp3s = links
                    .map(a => a.getAttribute('href'))
                    .filter(href => href && href.toLowerCase().endsWith('.mp3'))
                    .map(href => {
                        try {
                            // Convert %20 and other encoded characters back to normal text
                            return decodeURIComponent(href);
                        } catch (e) {
                            return href;
                        }
                    })
                    // Get only the file name and prepend the MP3 folder path
                    .map(href => {
                        const parts = href.split('/');
                        return 'MP3/' + parts[parts.length - 1];
                    });

                // Get unique, non-empty values
                const uniqueMp3s = [...new Set(foundMp3s)].filter(Boolean);
                
                if (uniqueMp3s.length > 0) {
                    console.log('Dynamic Scan found MP3 files:', uniqueMp3s);
                    return uniqueMp3s;
                }
            }
        } catch (error) {
            console.log('Could not scan directory dynamically (expected when files are not indexed or served via specific local configurations). Using pre-loaded files list.', error);
        }

        // Return fallback hardcoded list if scanning fails or finds nothing
        return FALLBACK_MP3_FILES;
    }

    /**
     * Clean file name for presentation (removes path and .mp3 extension)
     */
    function formatFileName(filename) {
        const base = filename.substring(filename.lastIndexOf('/') + 1);
        return base.replace(/\.mp3$/i, '');
    }

    /**
     * Initialize the audio soundboard
     */
    async function init() {
        const mp3Files = await scanMp3Files();
        
        // Clear the loading spinner
        buttonsContainer.innerHTML = '';

        if (mp3Files.length === 0) {
            buttonsContainer.innerHTML = `
                <div class="loading-state">
                    <p>找不到任何 MP3 檔案。</p>
                    <p style="font-size: 0.85rem; margin-top: 8px; color: var(--text-secondary);">請確認根目錄下存有 MP3 音檔。</p>
                </div>
            `;
            return;
        }

        // Create buttons for each file
        mp3Files.forEach((file, index) => {
            const displayName = formatFileName(file);
            const button = document.createElement('button');
            button.className = 'sound-btn';
            button.setAttribute('data-src', file);
            button.setAttribute('aria-label', `播放 ${displayName}`);
            button.id = `btn-${index}`;

            // Button Inner Content: Title & Play Icon
            button.innerHTML = `
                <span class="btn-title">
                    <span class="btn-index">${String(index + 1).padStart(2, '0')}</span>
                    <span class="btn-text" title="${displayName}">${displayName}</span>
                </span>
                <svg class="play-indicator-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 3L19 12L5 21V3Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;

            // Setup click handler
            button.addEventListener('click', () => playAudio(file, button));
            buttonsContainer.appendChild(button);
        });
    }

    /**
     * Play selected audio file and handle UI updates
     */
    function playAudio(src, clickedButton) {
        // If clicking the same button that is already playing, replay from start
        const isSameTrack = audioPlayer.src.endsWith(encodeURIComponent(src)) || audioPlayer.src.endsWith(src);
        
        // Remove styling from current active button
        if (currentActiveButton) {
            currentActiveButton.classList.remove('is-playing');
            // Reset icon of previously active button to Play
            updateButtonIcon(currentActiveButton, false);
        }

        // Update active references
        currentActiveButton = clickedButton;
        currentActiveButton.classList.add('is-playing');
        updateButtonIcon(currentActiveButton, true);

        // Update track metadata UI
        const displayName = formatFileName(src);
        trackNameLabel.textContent = displayName;
        statusText.textContent = '播放中';
        statusPanel.classList.add('playing');

        // Set source and play
        if (!isSameTrack) {
            audioPlayer.src = src;
        } else {
            // Replay from beginning if clicking the same button
            audioPlayer.currentTime = 0;
        }

        audioPlayer.play()
            .catch(error => {
                console.error('Playback failed:', error);
                statusText.textContent = '播放失敗';
                trackNameLabel.textContent = '無法播放該音檔 (請點擊頁面以允許音訊播放)';
                statusPanel.classList.remove('playing');
                currentActiveButton.classList.remove('is-playing');
                updateButtonIcon(currentActiveButton, false);
            });
    }

    /**
     * Helper to change button's SVG icon between Play and Pause/Wave
     */
    function updateButtonIcon(btn, isPlaying) {
        const svg = btn.querySelector('.play-indicator-icon');
        if (isPlaying) {
            // Change to Pulse/Pause style SVG
            svg.innerHTML = `
                <path d="M6 19H10V5H6V19ZM14 5V19H18V5H14Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            `;
        } else {
            // Return to Play SVG
            svg.innerHTML = `
                <path d="M5 3L19 12L5 21V3Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            `;
        }
    }

    /* Audio Event Listeners for feedback */

    // Update Progress Bar
    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.duration) {
            const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressBar.style.width = `${percentage}%`;
            progressBar.setAttribute('aria-valuenow', Math.round(percentage));
        }
    });

    // Reset when audio finishes playing (Single Play behavior)
    audioPlayer.addEventListener('ended', () => {
        statusText.textContent = '就緒';
        statusPanel.classList.remove('playing');
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
        
        if (currentActiveButton) {
            currentActiveButton.classList.remove('is-playing');
            updateButtonIcon(currentActiveButton, false);
            currentActiveButton = null;
        }
    });

    // Handle external or manual pauses
    audioPlayer.addEventListener('pause', () => {
        // If it paused but didn't end, keep button icon updated
        if (audioPlayer.currentTime < audioPlayer.duration) {
            statusText.textContent = '已暫停';
            statusPanel.classList.remove('playing');
            if (currentActiveButton) {
                updateButtonIcon(currentActiveButton, false);
            }
        }
    });

    // Start loading the player list
    init();
});
