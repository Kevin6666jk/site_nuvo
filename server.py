import os
import requests
import json
import traceback
import random  # <-- Importado para gerar códigos
from flask import (
    Flask, request, jsonify, send_from_directory, 
    session, redirect, url_for, make_response  # <-- Novas importações de login
)
from werkzeug.exceptions import HTTPException

# --- Configuração ---
app = Flask(__name__, static_folder='static') # Aponta para a pasta 'static'

# --- SEGREDO DO LOGIN ---
# Mude isso para qualquer frase secreta e longa
app.config['SECRET_KEY'] = 'mude-isso-para-algo-muito-secreto-e-aleatorio'

# Limite de 200MB para upload
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024 

# Arquivo do "banco de dados"
DB_FILE = 'uploads.json'
STATIC_DIR = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'static')

# --- Credenciais do Admin ---
ADMIN_USERNAME = "NuvoSA"
ADMIN_PASSWORD = "kkkjjjkkk"

# --- Manipuladores de Erro (Garante respostas JSON) ---
@app.errorhandler(HTTPException)
def handle_http_exception(e):
    response = e.get_response()
    response.data = json.dumps({"code": e.code, "name": e.name, "error": e.description})
    response.content_type = "application/json"
    return response

@app.errorhandler(Exception)
def handle_generic_exception(e):
    traceback.print_exc()
    return jsonify(error="Erro interno inesperado no servidor.", details=str(e)), 500

# --- Funções do "Banco de Dados" (Agora usa Códigos) ---

def load_uploads():
    """Carrega o DICIONÁRIO de músicas do JSON."""
    if not os.path.exists(DB_FILE):
        return {}  # Agora é um dicionário vazio
    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        return {}

def save_upload(code, filename, url):
    """Salva uma nova música no dicionário usando o código como chave."""
    uploads = load_uploads()
    uploads[code] = {
        "filename": filename,
        "url": url
    }
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(uploads, f, indent=4)

def generate_unique_code():
    """Gera um código de 5 dígitos que ainda não está em uso."""
    uploads = load_uploads()
    while True:
        # Gera um código como string, ex: "01234"
        code = str(random.randint(0, 99999)).zfill(5)
        if code not in uploads:
            return code

# --- ROTAS DE AUTENTICAÇÃO E ADMIN ---

@app.route('/login', methods=['POST'])
def login():
    """Processa a tentativa de login do admin."""
    username = request.form.get('username')
    password = request.form.get('password')

    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session['logged_in'] = True  # Define o cookie de sessão
        return jsonify({"success": True}), 200
    else:
        return jsonify({"error": "Usuário ou senha inválidos"}), 401

@app.route('/upload', methods=['POST'])
def upload_proxy():
    """ (PROTEGIDA) Recebe o arquivo e envia para a Catbox."""
    
    # --- Proteção de Rota ---
    if not session.get('logged_in'):
        return jsonify({"error": "Não autorizado"}), 401
    
    if 'fileToUpload' not in request.files:
        return jsonify({"error": "Nenhum 'fileToUpload' encontrado"}), 400
    
    file = request.files['fileToUpload']
    if file.filename == '':
        return jsonify({"error": "Nenhum arquivo selecionado"}), 400

    url_catbox = "https://catbox.moe/user/api.php"
    data = {'reqtype': 'fileupload', 'userhash': ''}
    files_to_send = {'fileToUpload': (file.filename, file.stream, file.content_type)}

    try:
        response = requests.post(url_catbox, files=files_to_send, data=data, timeout=300)
        response.raise_for_status()
        response_url = response.text.strip()

        if response_url.startswith("https://files.catbox.moe/"):
            # --- GERA O CÓDIGO ---
            new_code = generate_unique_code()
            save_upload(new_code, file.filename, response_url)
            
            # Retorna o código gerado para o admin
            return jsonify({"success": True, "url": response_url, "code": new_code})
        else:
            return jsonify({"error": f"Erro da Catbox: {response.text[:100]}"}), 500

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Erro de rede ao contatar Catbox: {e}"}), 502

@app.route('/get-music', methods=['GET'])
def get_music_list_admin():
    """ (PROTEGIDA) Envia a lista de TODAS as músicas para o admin."""
    if not session.get('logged_in'):
        return jsonify({"error": "Não autorizado"}), 401
    
    uploads = load_uploads()
    # Converte o dicionário em uma lista para o JS
    list_format = [{"code": code, "filename": data["filename"], "url": data["url"]} 
                   for code, data in uploads.items()]
    return jsonify(list_format)

# --- ROTAS PÚBLICAS (Visitante) ---

@app.route('/get-song/<code>', methods=['GET'])
def get_song_public(code):
    """ (PÚBLICA) Envia UMA música específica, se o código for válido."""
    uploads = load_uploads()
    song_data = uploads.get(code)
    
    if song_data:
        return jsonify(song_data)
    else:
        return jsonify({"error": "Código não encontrado"}), 404

# --- Rotas para servir as PÁGINAS (HTML) ---

@app.route('/')
def serve_index():
    """Serve a página pública de "inserir código"."""
    return send_from_directory(STATIC_DIR, 'index.html')

@app.route('/admin')
def serve_admin_login():
    """Serve a página de login do admin."""
    return send_from_directory(STATIC_DIR, 'admin.html')

@app.route('/dashboard')
def serve_dashboard():
    """ (PROTEGIDA) Serve a página de upload do admin."""
    if not session.get('logged_in'):
        # Se não estiver logado, chuta ele para a página de login
        return redirect(url_for('serve_admin_login'))
    
    # Se estiver logado, mostra o dashboard
    return send_from_directory(STATIC_DIR, 'dashboard.html')

@app.route('/<path:filename>')
def serve_static_files(filename):
    """Serve os arquivos CSS e JS."""
    return send_from_directory(STATIC_DIR, filename)

# --- Ponto de entrada ---
if __name__ == '__main__':
    print(f"Servidor Flask rodando em http://localhost:5000")
    print("Página pública: http://localhost:5000")
    print("Página de admin: http://localhost:5000/admin")
    app.run(host='0.0.0.0', port=5000)