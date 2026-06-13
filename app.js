document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audioPlayer');
    const buttonsContainer = document.getElementById('buttonsContainer');
    const statusPanel = document.getElementById('statusPanel');
    const statusText = document.getElementById('statusText');
    const trackNameLabel = document.getElementById('trackName');
    const progressBar = document.getElementById('progressBar');
    
    // Combo panel elements
    const playComboBtn = document.getElementById('playComboBtn');
    const clearComboBtn = document.getElementById('clearComboBtn');
    const comboDropzone = document.getElementById('comboDropzone');
    const comboPlaceholder = document.getElementById('comboPlaceholder');
    const comboList = document.getElementById('comboList');

    let currentActiveButton = null;
    let comboQueue = []; // Array of { id, src, name }
    let isComboPlaying = false;
    let currentComboIndex = -1;

    // Hardcoded fallback files found in the root directory
    const FALLBACK_MP3_FILES = [
        "MP3/Ara~Ara~.mp3",
        "MP3/let me thin think.mp3",
        "MP3/mental real 哭喔.mp3",
        "MP3/ㄉㄟˇㄒㄧㄡˊ.mp3",
        "MP3/一圈是365.mp3",
        "MP3/乾固了.mp3",
        "MP3/什麼屁溝難聽死了.mp3",
        "MP3/你們少囉嗦!.mp3",
        "MP3/你們很幽默喔.mp3",
        "MP3/你們自己當配菜.mp3",
        "MP3/你在講什麼我聽不懂.mp3",
        "MP3/你還是需要有個屁溝.mp3",
        "MP3/出BUG啦.mp3",
        "MP3/吸一吸 弄一弄.mp3",
        "MP3/咩.mp3",
        "MP3/哭喔.mp3",
        "MP3/哼 給我等著.mp3",
        "MP3/哼 鄙視.mp3",
        "MP3/哼! 360.mp3",
        "MP3/哼歌.mp3",
        "MP3/喔摁摁摁摁~~~.mp3",
        "MP3/囚禁感覺不錯.mp3",
        "MP3/外面的世界很危險.mp3",
        "MP3/大師晚上好阿.mp3",
        "MP3/好機車喔.mp3",
        "MP3/好痛苦喔.mp3",
        "MP3/完美.mp3",
        "MP3/對對對.mp3",
        "MP3/建模不要動腦.mp3",
        "MP3/我不會再講什麼365度了.mp3",
        "MP3/我不知道.mp3",
        "MP3/我不要活了.mp3",
        "MP3/我很抱歉 真的沒有(氣音).mp3",
        "MP3/我是隱性攻.mp3",
        "MP3/我的腰力挺好的.mp3",
        "MP3/我覺得挺好的.mp3",
        "MP3/抓捕雪貂.mp3",
        "MP3/拿去熬湯變成貂皮.mp3",
        "MP3/插進屁股.mp3",
        "MP3/早阿.mp3",
        "MP3/早阿哇沙米.mp3",
        "MP3/晚上好阿.mp3",
        "MP3/有沒有很簡單.mp3",
        "MP3/死給哪.mp3",
        "MP3/沒有 我很抱歉(氣音).mp3",
        "MP3/沒社入不會去.mp3",
        "MP3/溫和小受.mp3",
        "MP3/發出了奇怪的聲音.mp3",
        "MP3/笑死我了.mp3",
        "MP3/老師的屁股比較大.mp3",
        "MP3/耐心根性毅力.mp3",
        "MP3/腦袋放空.mp3",
        "MP3/買5090給我啊.mp3",
        "MP3/趴機趴機趴機趴機.mp3",
        "MP3/跑不動.mp3",
        "MP3/這段助教幫我剪掉.mp3",
        "MP3/阿不對不對不對(發出怪聲).mp3",
        "MP3/陪你打lol.mp3"
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

        // Create button cards for each file
        mp3Files.forEach((file, index) => {
            const displayName = formatFileName(file);
            
            // Container wrapper for layout (soundboard button + quick add button)
            const cardWrapper = document.createElement('div');
            cardWrapper.className = 'sound-card-wrapper';
            
            // The Play Button
            const button = document.createElement('button');
            button.className = 'sound-btn';
            button.setAttribute('data-src', file);
            button.setAttribute('aria-label', `播放 ${displayName}`);
            button.id = `btn-${index}`;
            button.setAttribute('draggable', 'true'); // Make button draggable

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

            // Setup play click handler
            button.addEventListener('click', () => {
                if (isComboPlaying) {
                    stopComboPlayback();
                }
                playAudio(file, button);
            });

            // Dragstart handler for Drag and Drop
            button.addEventListener('dragstart', (e) => {
                const dragData = { src: file, name: displayName };
                e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
                e.dataTransfer.effectAllowed = 'copy';
            });

            // The Quick Add Button
            const addToComboBtn = document.createElement('button');
            addToComboBtn.className = 'add-to-combo-btn';
            addToComboBtn.setAttribute('title', '加入組合清單');
            addToComboBtn.setAttribute('aria-label', `將 ${displayName} 加入組合清單`);
            addToComboBtn.innerHTML = '+';
            
            addToComboBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addToCombo(file, displayName);
            });

            // Assemble wrapper
            cardWrapper.appendChild(button);
            cardWrapper.appendChild(addToComboBtn);
            buttonsContainer.appendChild(cardWrapper);
        });

        // Initialize drag & drop dropzone listeners
        setupDropzoneListeners();
        
        // Initialize combo list UI
        renderComboList();
    }

    /**
     * Setup event listeners for the combo dropzone
     */
    function setupDropzoneListeners() {
        comboDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            comboDropzone.classList.add('drag-over');
            e.dataTransfer.dropEffect = 'copy';
        });

        comboDropzone.addEventListener('dragleave', () => {
            comboDropzone.classList.remove('drag-over');
        });

        comboDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            comboDropzone.classList.remove('drag-over');
            
            try {
                const rawData = e.dataTransfer.getData('text/plain');
                const data = JSON.parse(rawData);
                
                if (data && data.src && data.name) {
                    addToCombo(data.src, data.name);
                }
            } catch (error) {
                // Ignore errors from invalid drag sources (e.g. text from other websites)
            }
        });
    }

    /**
     * Add sound to combo queue
     */
    function addToCombo(src, name) {
        comboQueue.push({
            id: Date.now() + '-' + Math.random(),
            src: src,
            name: name
        });
        renderComboList();
    }

    /**
     * Remove sound from combo queue
     */
    function removeFromCombo(index) {
        if (isComboPlaying && currentComboIndex === index) {
            stopComboPlayback();
        } else if (isComboPlaying && index < currentComboIndex) {
            currentComboIndex--;
        }
        
        comboQueue.splice(index, 1);
        renderComboList();
    }

    /**
     * Render the combo queue items in the UI
     */
    function renderComboList() {
        if (comboQueue.length === 0) {
            comboPlaceholder.style.display = 'flex';
            comboList.style.display = 'none';
            playComboBtn.disabled = true;
            clearComboBtn.disabled = true;
            return;
        }

        comboPlaceholder.style.display = 'none';
        comboList.style.display = 'flex';
        playComboBtn.disabled = false;
        clearComboBtn.disabled = false;

        comboList.innerHTML = '';
        
        comboQueue.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'combo-item';
            itemEl.setAttribute('draggable', 'true');
            itemEl.setAttribute('data-index', index);
            
            if (isComboPlaying && currentComboIndex === index) {
                itemEl.classList.add('is-playing');
            }

            itemEl.innerHTML = `
                <span class="combo-item-handle">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M20 9H4v2h16V9zm0 4H4v2h16v-2z"/>
                    </svg>
                </span>
                <span class="combo-item-name">${item.name}</span>
                <button class="combo-item-delete" aria-label="移除">&times;</button>
            `;

            // Delete item handler
            itemEl.querySelector('.combo-item-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                removeFromCombo(index);
            });

            // Drag events for reordering within the combo list
            itemEl.addEventListener('dragstart', (e) => {
                itemEl.classList.add('dragging-item');
                e.dataTransfer.setData('text/combo-index', index);
                e.dataTransfer.effectAllowed = 'move';
            });

            itemEl.addEventListener('dragend', () => {
                itemEl.classList.remove('dragging-item');
                document.querySelectorAll('.combo-item').forEach(el => el.classList.remove('drag-over'));
            });

            itemEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                itemEl.classList.add('drag-over');
            });

            itemEl.addEventListener('dragleave', () => {
                itemEl.classList.remove('drag-over');
            });

            itemEl.addEventListener('drop', (e) => {
                e.preventDefault();
                itemEl.classList.remove('drag-over');
                
                const fromIndexStr = e.dataTransfer.getData('text/combo-index');
                if (fromIndexStr !== '') {
                    const fromIndex = parseInt(fromIndexStr, 10);
                    const toIndex = index;
                    
                    if (fromIndex !== toIndex) {
                        // Move item inside queue
                        const element = comboQueue.splice(fromIndex, 1)[0];
                        comboQueue.splice(toIndex, 0, element);
                        
                        // Adjust active index if combo is playing
                        if (isComboPlaying) {
                            if (currentComboIndex === fromIndex) {
                                currentComboIndex = toIndex;
                            } else if (fromIndex < currentComboIndex && toIndex >= currentComboIndex) {
                                currentComboIndex--;
                            } else if (fromIndex > currentComboIndex && toIndex <= currentComboIndex) {
                                currentComboIndex++;
                            }
                        }
                        
                        renderComboList();
                    }
                }
            });

            comboList.appendChild(itemEl);
        });
    }

    /**
     * Start playing combo queue
     */
    function playCombo() {
        if (comboQueue.length === 0) return;

        if (isComboPlaying) {
            stopComboPlayback();
            return;
        }

        isComboPlaying = true;
        currentComboIndex = 0;
        
        updatePlayComboButtonUI(true);
        
        // Remove styling from single track player
        if (currentActiveButton) {
            currentActiveButton.classList.remove('is-playing');
            updateButtonIcon(currentActiveButton, false);
            currentActiveButton = null;
        }

        playNextComboItem();
    }

    /**
     * Play current indexed track in the combo queue
     */
    function playNextComboItem() {
        if (!isComboPlaying) return;

        if (currentComboIndex >= comboQueue.length) {
            // Queue finished
            stopComboPlayback();
            return;
        }

        const currentItem = comboQueue[currentComboIndex];
        
        // Highlight active card
        renderComboList();

        // Update status panel
        trackNameLabel.textContent = `[組合播放 ${currentComboIndex + 1}/${comboQueue.length}] ${currentItem.name}`;
        statusText.textContent = '組合播放中';
        statusPanel.classList.add('playing');

        audioPlayer.src = currentItem.src;
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');

        audioPlayer.play()
            .catch(error => {
                console.error('Combo playback failed:', error);
                // Move to next track automatically
                currentComboIndex++;
                playNextComboItem();
            });
    }

    /**
     * Stop combo queue playback
     */
    function stopComboPlayback() {
        isComboPlaying = false;
        currentComboIndex = -1;
        
        audioPlayer.pause();
        audioPlayer.src = '';
        
        // Reset status panel UI
        statusText.textContent = '就緒';
        statusPanel.classList.remove('playing');
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
        trackNameLabel.textContent = '未播放任何音樂';

        updatePlayComboButtonUI(false);
        renderComboList();
    }

    /**
     * Update Play/Stop button labels and icons
     */
    function updatePlayComboButtonUI(isPlaying) {
        if (isPlaying) {
            playComboBtn.classList.add('playing');
            playComboBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
                停止播放
            `;
        } else {
            playComboBtn.classList.remove('playing');
            playComboBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                組合播放
            `;
        }
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

    // Reset when audio finishes playing
    audioPlayer.addEventListener('ended', () => {
        if (isComboPlaying) {
            currentComboIndex++;
            playNextComboItem();
            return;
        }

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
        if (audioPlayer.currentTime < audioPlayer.duration) {
            statusText.textContent = '已暫停';
            statusPanel.classList.remove('playing');
            if (currentActiveButton) {
                updateButtonIcon(currentActiveButton, false);
            }
        }
    });

    // Bind Combo Action Buttons
    playComboBtn.addEventListener('click', playCombo);
    clearComboBtn.addEventListener('click', () => {
        stopComboPlayback();
        comboQueue = [];
        renderComboList();
    });

    // Start loading the player list
    init();
});
