# FIFA SCORE 2026 - Classifica & Pronostici Mondiali

Applicazione web in Node.js ed Express per monitorare l'andamento dei pronostici dei partecipanti alla FIFA World Cup 2026 in base ai risultati reali dei match.

---

## 📂 Struttura del Progetto

```text
fifa-score/
├── Data/
│   ├── data.json              # Database locale dei giocatori, punteggi e pronostici
│   └── games.json             # Database locale delle partite (calendario, gol, stati)
├── public/                    # File statici del frontend
│   ├── index.html             # Pagina principale (Classifica Generale)
│   ├── app.js                 # Logica per la classifica generale e l'anteprima del match
│   ├── next-match.html        # Dettaglio del match corrente e dei pronostici associati
│   ├── next-match.js          # Logica per navigare tra i match e caricare le giocate
│   ├── player.html            # Scheda di dettaglio di un singolo giocatore
│   ├── player.js              # Carica lo storico di tutti i pronostici e degli esiti del giocatore
│   ├── update.html            # Pannello di amministrazione e controllo
│   ├── update.js              # Logica per le simulazioni e la sincronizzazione manuale
│   └── style.css              # Foglio di stile CSS centralizzato (Dark Theme premium)
├── apiService.js              # Servizio per la comunicazione e il sync con l'API esterna
├── scoreManager.js            # Manager per i file JSON locali e per il calcolo dei punteggi
├── server.js                  # Server di backend Express e definizione delle rotte API
├── package.json               # Configurazione del progetto e dipendenze
└── README.md                  # Documentazione dell'applicazione
```

---

## 🖥️ Pagine del Sito & Funzionalità

L'applicazione frontend si compone di 4 pagine principali:

### 1. 🏆 Classifica Generale (`index.html`)
La homepage del sito visualizza la classifica dei partecipanti ordinata in ordine decrescente in base al punteggio accumulato.
* Mostra la tabella della **Classifica Generale** (Posizione, Nome Giocatore, Punti).
* Cliccando sul nome di un giocatore si viene reindirizzati alla sua scheda dettagliata.
* Sulla destra (o in basso su dispositivi mobili) è presente un widget con la **Prossima Partita** in calendario.

### 2. 📅 Prossima Partita & Pronostici (`next-match.html`)
Questa pagina mostra le informazioni dettagliate sull'incontro correntemente selezionato e raccoglie tutti i pronostici fatti dai giocatori per quell'evento.
* Visualizza i loghi delle nazionali, la data/ora del match, il risultato finale (se concluso) o il badge animato **LIVE** (se la partita è in corso).
* Fornisce controlli di navigazione (`Match Precedente` / `Match Successivo`) per scorrere l'intero calendario dei Mondiali in ordine cronologico.
* Mostra una griglia contenente i pronostici (`1`, `X`, `2`) inseriti da ciascun partecipante per quella partita.

### 3. 👤 Dettaglio Giocatore (`player.html`)
Fornisce una scheda di riepilogo del rendimento di un singolo partecipante.
* Mostra il punteggio totale del giocatore.
* Contiene una tabella riassuntiva di tutti i match giocati e da giocare ordinati cronologicamente.
* Per ciascun match riporta il risultato effettivo (con indicatore **LIVE** se in corso), il pronostico del giocatore e l'esito della scommessa (contrassegnato graficamente con colori dedicati ed icone di spunta verde o croce rossa).

### 4. ⚙️ Pannello di Amministrazione (`update.html`)
Pagina dedicata alla gestione del database e all'avanzamento dei match.
* **Sincronizzazione Automatica**: Permette di allineare manualmente l'intero database delle partite con l'API esterna.
* **Gestione Risultati (Manuale)**: Consente di selezionare un match dal calendario per impostare gol manuali, resettarlo allo stato `"Non Iniziata"` o simularne il risultato in modo casuale.
* **Ricalcolo Classifica**: Forza il ricalcolo manuale dei punteggi dei giocatori leggendo i dati locali di `data.json` e `games.json`.
* **Output & Status Log**: Una console terminale virtuale integrata per monitorare i log di sistema e i messaggi di risposta delle API locali in tempo reale.

---

## ⚙️ Rotte API Principali

| Metodo | Endpoint | Descrizione |
|---|---|---|
| **GET** | `/api/players` | Restituisce la classifica ordinata dei giocatori |
| **GET** | `/api/next-match` | Restituisce il prossimo match non terminato |
| **GET** | `/api/match/:index` | Restituisce il match all'indice specificato |
| **GET** | `/api/match/:index/predictions` | Ritorna i pronostici dei giocatori per quel match |
| **GET** | `/api/matches` | Restituisce la lista di tutti i match in ordine cronologico |
| **POST** | `/api/sync` | Sincronizza tutti i match dall'API esterna |
| **POST** | `/api/recalculate` | Ricalcola manualmente tutti i punteggi |
| **POST** | `/api/simulate-match` | Simula il risultato del prossimo match |
| **POST** | `/api/update-match` | Modifica manualmente punteggio/stato di una partita |
| **ALL** | `/api/update-next-match` | Rotta ottimizzata per il sync automatico tramite cronjob |

---

## 🔄 Meccanismo di Sync & Chiamata API per `update-next-match`

L'endpoint `/api/update-next-match` è progettato per automatizzare l'aggiornamento dei match in tempo reale.

### Configurazione del Cronjob
La rotta `/api/update-next-match` viene invocata periodicamente ogni **5 minuti** tramite il servizio esterno **[cron-job.org](https://cron-job.org/)**.

### Logica di Aggiornamento
Quando l'API viene chiamata dal cronjob, interroga il database locale per identificare il prossimo match non concluso (e gli eventuali match simultanei con lo stesso timestamp) e applica la seguente logica temporale:

1. **Partita non ancora iniziata** (`Timestamp Partita > Ora Corrente`):
   * L'applicazione lascia lo stato inalterato (`NS` - *Not Started*).
   * **Nessuna chiamata** viene effettuata verso l'API esterna per risparmiare risorse e quote di consumo.

2. **Partita in corso** (`Ora Corrente` compresa tra `Timestamp Partita` e `Timestamp Partita + 115 minuti`):
   * Lo stato del match nel database locale viene impostato automaticamente a **`"LIVE"`** (con descrizione `"In Progress"`).
   * **Nessuna chiamata** viene effettuata all'API esterna.
   * **Nessun ricalcolo della classifica** viene eseguito: i punteggi rimangono invariati per tutta la durata del match.

3. **Partita conclusa / Fase finale** (`Ora Corrente >= Timestamp Partita + 115 minuti`):
   * L'applicazione effettua una chiamata GET all'API esterna (`https://worldcup26.ir/get/games`).
   * Se l'API esterna conferma che la partita è finita (`finished: "TRUE"`):
     * Vengono registrati i gol definitivi segnati dalla squadra in casa e in trasferta.
     * Lo stato della partita viene aggiornato a `"FT"` (*Match Finished*), `"AET"` o `"PEN"`.
     * Viene eseguito l'**aggiornamento e ricalcolo automatico della classifica** dei partecipanti.
