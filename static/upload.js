document.addEventListener('DOMContentLoaded', () => {

    // --- Elementos do Uploader ---
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const uploadButton = document.getElementById('uploadButton');
    const status = document.getElementById('status');
    const resultUrl = document.getElementById('resultUrl');

    // --- NOVOS Elementos do Player ---
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
            status.textContent = '';
            resultUrl.value = '';
        } else {
            selectedFile = null;
            fileName.textContent = 'Nenhum arquivo selecionado';
            uploadButton.disabled = true;
        }
    });

    uploadButton.addEventListener('click', async () => {
        if (!selectedFile) {
            alert("Por favor, selecione um arquivo primeiro.");
            return;
        }

        uploadButton.disabled = true;
        fileInput.disabled = true;
        status.textContent = `Enviando ${selectedFile.name}...`;
        resultUrl.value = '';

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

            if (data.success && data.url) {
                status.textContent = 'Upload concluído com sucesso!';
                resultUrl.value = data.url;
                
                // ATUALIZA A LISTA DE MÚSICAS APÓS O UPLOAD
                await fetchMusicList(); 
            } else {
                throw new Error(data.error || 'Resposta inválida do servidor.');
            }

        } catch (error) {
            console.error('Erro no Upload:', error);
            status.textContent = `Erro: ${error.message}`;
            alert(`Erro no Upload: ${error.message}`);
        } finally {
            uploadButton.disabled = false;
            fileInput.disabled = false;
        }
    });

    // --- NOVA Lógica do Player de Música ---

    /**
     * Busca a lista de músicas do servidor.
     */
    async function fetchMusicList() {
        try {
            const response = await fetch('/get-music');
            if (!response.ok) {
                throw new Error('Não foi possível carregar a lista de músicas.');
            }
            const songs = await response.json();
            renderMusicList(songs);
        } catch (error) {
            console.error(error);
            musicList.innerHTML = '<p style="color: red;">Erro ao carregar músicas.</p>';
        }
    }

    /**
     * Desenha a lista de músicas na tela.
     * @param {Array} songs - Um array de objetos {filename: "...", url: "..."}
     */
    function renderMusicList(songs) {
        // Limpa a lista antiga
        musicList.innerHTML = '';

        if (songs.length === 0) {
            musicList.innerHTML = '<p>Nenhuma música enviada ainda.</p>';
            return;
        }

        // Adiciona cada música na lista
        songs.forEach(song => {
            const item = document.createElement('div');
            item.className = 'music-item';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = song.filename;

            const playButton = document.createElement('button');
            playButton.textContent = 'Play';
            playButton.className = 'play-button';

            // Adiciona o evento de clique para tocar a música
            playButton.addEventListener('click', () => {
                audioPlayer.src = song.url; // Define a URL da música no player
                audioPlayer.play(); // Toca a música
                nowPlaying.textContent = `Tocando agora: ${song.filename}`;
            });

            item.appendChild(nameSpan);
            item.appendChild(playButton);
            musicList.appendChild(item);
        });
    }

    // --- Inicialização ---
    // Carrega a lista de músicas assim que a página abrir
    fetchMusicList();
});