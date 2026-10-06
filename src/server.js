const express = require('express')
const app = express()
require('dotenv').config()
const PORT = process.env.PORT || 3001
const cors = require('cors')

console.log(`Node.js ${process.version}`)


app.use(express.json())
app.use(cors({
    origin: [ 
        'http://localhost:5173'
    ]
}))


app.get('/', (req, res) => {
    res.json({ msg: "Frotend API" })
})

const notesRoutes = require('./routes/notes')
const boardsRouter = require('./routes/boards')
app.use('/notes', notesRoutes)
app.use('/boards', boardsRouter)



app.listen(PORT, () => {
    try {
        console.log(`Running on http://localhost:${PORT}`)
    } catch (error) {
        console.error(`Error starting server: ${error.message}`)
    }
    
})
