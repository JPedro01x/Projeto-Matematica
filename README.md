# Bingo Matematico

Aplicacao web para criar partidas de bingo matematico em sala de aula. O professor cria uma sala, compartilha um PIN ou QR Code, e os alunos entram pelo celular para resolver desafios matematicos e marcar as respostas na cartela.

Link de acesso em producao:

https://projeto-matematica-nine.vercel.app/

## Visao geral

O projeto funciona como um jogo multiplayer educacional:

- O professor acessa a area do professor e cria uma partida.
- Cada partida gera um PIN unico e um QR Code.
- Os alunos entram usando o PIN ou escaneando o QR Code.
- Cada aluno informa um apelido.
- O professor inicia a partida.
- O sistema sorteia desafios matematicos.
- O aluno resolve o desafio e marca a resposta correspondente na cartela.
- O sistema valida se a resposta marcada esta correta.
- Ao cumprir a condicao de vitoria, a partida termina e mostra o ranking final.

## Tecnologias utilizadas

- React: biblioteca principal para construcao da interface.
- TypeScript: tipagem estatica para reduzir erros no codigo.
- Vite: ferramenta de build e servidor de desenvolvimento.
- React Router: controle das rotas da aplicacao.
- Tailwind CSS: estilizacao utilitaria.
- shadcn/ui: componentes de interface reutilizaveis.
- Lucide React: biblioteca de icones.
- Supabase: banco de dados hospedado na nuvem.
- Vercel: hospedagem da aplicacao em producao.
- Vitest: ferramenta de testes automatizados.

## Arquitetura

O projeto e uma SPA, ou seja, uma Single Page Application. O navegador carrega um unico HTML e o React controla a navegacao internamente.

Para evitar erro 404 ao abrir rotas diretamente no deploy, o projeto usa `HashRouter`. Por isso, rotas internas podem aparecer no formato:

```txt
https://projeto-matematica-nine.vercel.app/#/entrar
```

O armazenamento fica em dois modos:

- Modo producao: usa Supabase, permitindo que professor e alunos em dispositivos diferentes acessem a mesma sala.
- Modo local/fallback: se as variaveis do Supabase nao existirem, usa `localStorage`, funcionando apenas no mesmo navegador.

## Regras de negocio

### Professor

- O professor entra informando um apelido.
- O apelido do professor fica salvo no navegador.
- O professor pode criar varias partidas.
- Cada partida pertence ao apelido do professor que a criou.
- O professor so consegue abrir salas criadas pelo mesmo apelido.
- O professor pode remover jogadores da sala.
- O professor pode iniciar, pausar, finalizar desafio e encerrar partida.

### Criacao da sala

Ao criar uma sala, o professor define:

- Nome da partida.
- Quantidade de linhas da cartela.
- Quantidade de colunas da cartela.
- Condicao de vitoria.
- Dificuldade.
- Conteudos matematicos.

Cada sala recebe:

- ID unico.
- PIN de 6 digitos.
- Status inicial `waiting`.
- Lista de jogadores vazia.
- Lista de desafios vazia ate o jogo iniciar.

### Entrada do aluno

O aluno pode entrar de duas formas:

- Digitando o PIN.
- Escaneando o QR Code.

O QR Code abre uma URL contendo o ID da sala e o PIN:

```txt
/#/entrar?room=ID_DA_SALA&pin=123456
```

A tela de entrada tenta encontrar a sala pelo ID primeiro. Se nao encontrar, tenta pelo PIN.

O aluno precisa informar um apelido valido. O sistema:

- Bloqueia apelidos vazios.
- Bloqueia apelidos muito curtos ou muito longos.
- Bloqueia conteudo inadequado.
- Impede apelidos duplicados dentro da mesma sala.

### Cartela

- Cada aluno recebe uma cartela.
- A cartela contem respostas possiveis para os desafios.
- O aluno marca uma celula ao resolver o desafio atual.
- Se a resposta estiver correta, a celula fica marcada permanentemente.
- Se estiver incorreta, o aluno recebe feedback de erro.
- O aluno so pode responder uma vez por desafio.

### Desafios

Quando o professor inicia a partida:

- O sistema calcula quantos desafios serao necessarios.
- Gera desafios de acordo com os conteudos e dificuldade.
- Distribui as respostas nas cartelas dos jogadores.
- Sorteia o primeiro desafio.

Durante a partida:

- O professor pode finalizar o desafio atual.
- O sistema controla quais jogadores ja responderam.
- Quando todos respondem, o desafio pode avancar automaticamente.

### Vitoria

A condicao de vitoria pode ser:

- Linha.
- Coluna.
- Diagonal.
- Cartela cheia.

Quando um jogador cumpre a condicao:

- A sala recebe `winner_id`.
- O status da partida vira `finished`.
- Os jogadores sao levados para a tela de resultados.

### Resultados

A tela de resultados mostra:

- Vencedor.
- Ranking dos participantes.
- Quantidade de acertos de cada jogador.
- Total de jogadores.
- Maior pontuacao.
- Media de acertos.

Ao final, o jogador pode voltar para a home.

## Estrutura de pastas

```txt
src/
  components/       Componentes reutilizaveis
  components/ui/    Componentes base da interface
  hooks/            Hooks React
  integrations/     Integracoes externas, como Supabase
  lib/              Regras de jogo, validacoes e persistencia
  pages/            Paginas principais da aplicacao
  tests/            Testes automatizados
```

Arquivos importantes:

- `src/lib/bingo.ts`: regras de geracao de desafios, cartelas e verificacao de vitoria.
- `src/lib/localStore.ts`: camada de persistencia, usando Supabase em producao e `localStorage` como fallback.
- `src/pages/TeacherDashboard.tsx`: painel do professor.
- `src/pages/HostRoom.tsx`: tela da sala para o professor.
- `src/pages/JoinRoom.tsx`: entrada do aluno por PIN ou QR Code.
- `src/pages/PlayRoom.tsx`: tela de jogo do aluno.
- `src/pages/GameResults.tsx`: tela de resultados.
- `supabase-schema.sql`: estrutura das tabelas e politicas do Supabase.

## Banco de dados

O projeto usa duas tabelas principais no Supabase:

### `rooms`

Armazena as salas criadas pelos professores.

Campos principais:

- `id`: identificador unico da sala.
- `name`: nome da partida.
- `pin`: PIN de acesso.
- `owner_nickname`: apelido do professor dono da sala.
- `status`: estado da partida, como `waiting`, `playing` ou `finished`.
- `rows` e `cols`: tamanho da cartela.
- `win_condition`: regra de vitoria.
- `topics`: conteudos escolhidos.
- `difficulty`: dificuldade.
- `current_challenge`: desafio atual.
- `game_challenges`: lista de desafios da partida.
- `drawn_answers`: respostas ja sorteadas.
- `winner_id`: jogador vencedor.

### `players`

Armazena os jogadores.

Campos principais:

- `id`: identificador unico do jogador.
- `room_id`: sala em que o jogador entrou.
- `nickname`: apelido.
- `card`: cartela do jogador.
- `marked`: posicoes marcadas.
- `has_won`: indica se venceu.
- `correct_answers_count`: quantidade de acertos.

## Configuracao do Supabase

Antes de usar em producao, execute o SQL do arquivo:

```txt
supabase-schema.sql
```

No Supabase:

1. Abra o projeto.
2. Va em SQL Editor.
3. Crie uma nova query.
4. Cole o conteudo de `supabase-schema.sql`.
5. Execute.

Depois configure as variaveis de ambiente na Vercel:

```env
VITE_SUPABASE_URL=https://mldfbiclexhpkewtwxbh.supabase.co
VITE_SUPABASE_ANON_KEY=sua_publishable_key_do_supabase
```

Tambem e aceito:

```env
VITE_SUPABASE_PUBLISHABLE_KEY=sua_publishable_key_do_supabase
```

Depois de alterar variaveis na Vercel, e necessario fazer novo deploy.

## Como rodar localmente

### Pre-requisitos

- Node.js instalado.
- npm instalado.

### Instalar dependencias

```bash
npm install
```

### Configurar ambiente local

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://mldfbiclexhpkewtwxbh.supabase.co
VITE_SUPABASE_ANON_KEY=sua_publishable_key_do_supabase
```

Se voce nao criar o `.env`, o projeto ainda roda, mas usando `localStorage`. Nesse modo, outro dispositivo nao consegue entrar na sala criada.

### Rodar em desenvolvimento

```bash
npm run dev
```

Por padrao, o Vite esta configurado para a porta `4000`:

```txt
http://localhost:4000
```

### Gerar build de producao

```bash
npm run build
```

### Rodar testes

```bash
npm test -- --run
```

## Deploy

O projeto esta publicado na Vercel:

https://projeto-matematica-nine.vercel.app/

Para atualizar o site:

1. Faça commit e envie o codigo para o repositorio conectado a Vercel.
2. Ou use o fluxo de deploy configurado no painel da Vercel.
3. Se alterar variaveis de ambiente, rode um novo deploy.

## Observacoes importantes

- Salas criadas antes da configuracao do Supabase podem existir apenas no navegador do professor.
- Depois de configurar Supabase e redeployar, crie uma sala nova.
- A chave correta para frontend e a Publishable key do Supabase.
- Nunca use a Secret key no frontend.
- O banco do Supabase fica hospedado na nuvem e nao depende do computador do professor ligado.

