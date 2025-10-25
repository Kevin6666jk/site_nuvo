// Este script único controla tanto 'admin.html' quanto 'dashboard.html'
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Lógica da Página de Login (admin.html) ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const status = document.getElementById('status');
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Impede o envio tradicional do formulário
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            status.textContent = 'Logando...';
            
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    // Converte os dados para o formato que o Flask espera
                    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Erro de login');
                }

                // Sucesso! Redireciona para o dashboard
                status.textContent = 'Sucesso! Redirecionando...';
                window.location.href = '/dashboard'; // Manda o admin para a página de upload

            } catch (error) {
                status.textContent = `Erro: ${error.message}`;
                status.style.color = 'red';
            }
        });
    }

    // --- Lógica da Página do Dashboard (dashboard.html) ---
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        // Elementos do Uploader
        const fileName = document.getElementById('fileName');
        const uploadButton = document.getElementById('uploadButton');
        const uploadStatus = document.getElementById('status');

        // Elementos do Player
        const musicList = document.getElementById('musicList');
        const audioPlayer = document.getElementById('audioPlayer');
        const nowPlaying = document.getElementById('nowPlaying');

        let selectedFile = null;

        // --- Lógica do Uploader ---
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                selectedFile = fileInput.files[0];
                fileName.textContent = selectedFile.name;
                uploadButton.disabled = false;
            } else {
                selectedFile = null;
                fileName.textContent = 'Nenhum arquivo selecionado';
                uploadButton.disabled = true;
            }
        });

        uploadButton.addEventListener('click', async () => {
            if (!selectedFile) return;

            uploadButton.disabled = true;
            fileInput.disabled = true;
            uploadStatus.textContent = `Enviando ${selectedFile.name}...`;
            uploadStatus.style.color = 'black';

            const formData = new FormData();
            formData.append('fileToUpload', selectedFile);

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || `Erro HTTP ${response.status}`);
                }

                if (data.success && data.code) {
                    // --- SUCESSO! Mostra o código gerado ---
                    uploadStatus.textContent = `Sucesso! Código gerado: ${data.code}`;
                    uploadStatus.style.color = 'green';
                    
                    await fetchMusicList(); // Atualiza a lista de músicas
                } else {
                    throw new Error(data.error || 'Resposta inválida do servidor.');
                }

            } catch (error) {
                console.error('Erro no Upload:', error);
                uploadStatus.textContent = `Erro: ${error.message}`;
                uploadStatus.style.color = 'red';
            } finally {
                uploadButton.disabled = false;
                fileInput.disabled = false;
            }
        });

        // --- Lógica do Player de Música ---
        async function fetchMusicList() {
            try {
                const response = await fetch('/get-music'); // Rota protegida
                if (!response.ok) {
                    // Se a sessão expirou, o servidor dará 401
                    if (response.status === 401) {
                        alert('Sua sessão expirou. Por favor, faça login novamente.');
                        window.location.href = '/admin';
                    }
                    throw new Error('Não foi possível carregar a lista de músicas.');
                }
                const songs = await response.json(); // Agora é uma lista
                renderMusicList(songs);
            } catch (error) {
                console.error(error);
                musicList.innerHTML = '<p style="color: red;">Erro ao carregar músicas.</p>';
            }
        }

        function renderMusicList(songs) {
            musicList.innerHTML = '';
            if (songs.length === 0) {
                musicList.innerHTML = '<p>Nenhuma música enviada ainda.</p>';
                return;
            }

            songs.reverse().forEach(song => { // .reverse() mostra as mais novas primeiro
                const item = document.createElement('div');
                item.className = 'music-item';

                // Mostra o CÓDIGO e o NOME
                const codeSpan = document.createElement('span');
                codeSpan.className = 'info';
                codeSpan.textContent = `[${song.code}]`;
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = song.filename;

                const playButton = document.createElement('button');
                playButton.textContent = 'Play';
                playButton.className = 'play-button';

                playButton.addEventListener('click', () => {
                    audioPlayer.src = song.url;
                    audioPlayer.play();
                    nowPlaying.textContent = `Tocando agora: [${song.code}] ${song.filename}`;
                });

                item.appendChild(codeSpan);
                item.appendChild(nameSpan);
                item.appendChild(playButton);
                musicList.appendChild(item);
            });
        }

        // Carrega a lista de músicas assim que o admin abre o dashboard
        fetchMusicList();
    }
});