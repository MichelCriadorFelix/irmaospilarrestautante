# 🍔 Irmãos Pilar - Sistema de Pedidos e Central de Admin

Um sistema moderno e responsivo para pedidos e gerenciamento de cardápio do estabelecimento **Irmãos Pilar**, otimizado para Celulares, Tablets e PCs.

O aplicativo é desenvolvido em **React (com Vite)** e **Tailwind CSS**, utilizando o **Firebase (Firestore, Authentication e Storage)** como backend em tempo real, garantindo atualizações instantâneas de pedidos e um sistema de chat integrado.

---

## 🚀 Funcionalidades Principais

*   **Responsividade Perfeita**: Layout fluído e moderno adaptado para todos os tamanhos de telas (Mobile, Tablet e Computador).
*   **Acompanhamento em Tempo Real (Stepper)**: O cliente vê o status de preparo do seu pedido atualizar instantaneamente com notificações sonoras e visuais.
*   **Chat em Tempo Real**: Chat direto entre cliente e admin acoplado aos detalhes de cada pedido, com alertas sonoros de novas mensagens.
*   **Sons de Notificação Integrados**: Synthesizer puro (via Web Audio API) para alertas de novos pedidos (para os admins) e novas mensagens ou mudanças de status (para os clientes).
*   **Instalação PWA**: Botão de instalação simples no cabeçalho e menu lateral.
*   **Central do Admin**: Gráficos estatísticos de vendas diárias e mensais, controle financeiro completo, gerenciamento rápido do cardápio e alteração instantânea do status dos pedidos.
*   **Persistência Completa de Dados**: Cadastro de dados do cliente (Nome, WhatsApp, Endereço de Entrega Completo) persistido com segurança no Firestore.

---

## ⚙️ Preparação para Deploy no GitHub e Vercel

### 1. Como subir para o GitHub
Para inicializar o Git e enviar seu projeto para um repositório no GitHub:

```bash
# Inicializar o repositório local
git init

# Adicionar todos os arquivos (o .gitignore já está configurado para ocultar pastas desnecessárias)
git add .

# Criar o primeiro commit
git commit -m "feat: configuracoes prontas para producao e vercel"

# Conectar ao seu repositório remoto do GitHub
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git

# Renomear a branch padrão para main e enviar os arquivos
git branch -M main
git push -u origin main
```

---

### 2. Como publicar na Vercel (Passo a Passo)

A plataforma **Vercel** detectará automaticamente que este é um projeto **Vite** e configurará o build correto.

#### **Passo 1: Conectar o Repositório**
1. Acesse o painel da [Vercel](https://vercel.com/) e faça login com sua conta do GitHub.
2. Clique em **Add New...** > **Project**.
3. Importe o repositório correspondente ao projeto **Irmãos Pilar**.

#### **Passo 2: Configurações do Projeto**
A Vercel preencherá as configurações padrão corretas para o Vite:
*   **Framework Preset**: `Vite`
*   **Build Command**: `npm run build` ou `vite build`
*   **Output Directory**: `dist`

#### **Passo 3: Variáveis de Ambiente (Opcional)**
Por padrão, o projeto utiliza o arquivo local `firebase-applet-config.json` que é enviado com o repositório e funciona de forma totalmente segura e automática.

Caso queira usar um banco de dados Firebase diferente para o ambiente de produção na Vercel, basta adicionar as seguintes **Environment Variables** nas configurações do projeto na Vercel:

| Chave | Descrição |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Chave de API do Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domínio de Autenticação do Firebase |
| `VITE_FIREBASE_PROJECT_ID` | ID do seu Projeto Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | Link do Bucket de Armazenamento |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ID de Remetente para Mensagens |
| `VITE_FIREBASE_APP_ID` | ID Único do Aplicativo |
| `VITE_FIREBASE_DATABASE_ID` | ID do Banco Firestore (opcional se usar o default) |

*Nota: O arquivo `/vercel.json` incluído na raiz garante que todas as rotas do aplicativo (SPA) redirecionem perfeitamente para `/index.html` mesmo ao atualizar a página (F5).*

---

## 💻 Desenvolvimento Local

Para rodar e testar o projeto na sua máquina:

1.  **Instale as dependências**:
    ```bash
    npm install
    ```

2.  **Inicie o servidor de desenvolvimento**:
    ```bash
    npm run dev
    ```

3.  **Abra no navegador**:
    Acesse `http://localhost:3000` (ou a porta exibida no terminal).

---

## 🛠️ Tecnologias Utilizadas
*   **React 19** com **TypeScript**
*   **Vite** (Build Tool super rápido)
*   **Tailwind CSS 4** (Estilização responsiva e moderna)
*   **Framer Motion / Motion** (Animações interativas fluidas)
*   **Lucide React** (Ícones modernos e vetoriais)
*   **Firebase 12** (Firestore DB, Firebase Auth para Login seguro e Real-time listeners)
*   **Web Audio API** (Sintetizador nativo para avisos sonoros instantâneos de alta fidelidade)
