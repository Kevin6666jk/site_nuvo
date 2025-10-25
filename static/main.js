document.addEventListener('DOMContentLoaded', () => {
    // Elementos da página pública
    const codeInput = document.getElementById('codeInput');
    const enterButton = document.getElementById('enterButton');
    const status = document.getElementById('status');
    const playerArea = document.getElementById('playerArea');
    const audioPlayer = document.getElementById('audioPlayer');
    const nowPlaying = document.getElementById('nowPlaying');

    enterButton.addEventListener('click', async () => {
        const code = codeInput.value.trim();
        if (code.length !== 5) {
            status.textContent = 'O código deve ter 5 dígitos.';
            status.style.color = 'red';
            return;
        }

        status.textContent = 'Buscando...';
        status.style.color = 'black';
        playerArea.style.display = 'none';

        try {
            // 1. Faz a requisição para a nova rota pública
            const response = await fetch(`/get-song/${code}`);
            const data = await response.json();

            if (!response.ok) {
                // Erro (ex: 404 - Não encontrado)
                throw new Error(data.error || 'Erro ao buscar música.');
            }

            // 2. Sucesso!
            status.textContent = '';
            nowPlaying.textContent = `Tocando agora: ${data.filename}`;
            audioPlayer.src = data.url;
            playerArea.style.display = 'block'; // Mostra o player
            audioPlayer.play();

        } catch (error) {
            console.error(error);
            status.textContent = `Erro: ${error.message}`;
            status.style.color = 'red';
            playerArea.style.display = 'none';
        }
    });
});