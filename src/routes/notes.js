const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const authorize = require('../middleware/authorize')
const { z } = require('zod')

const prisma = new PrismaClient()

router.use(authorize)

const noteSchema = z.object({
  note: z.string(),
  color: z.string(),
  position: z.object({ x: z.number(), y: z.number() })
})

router.get('/', async (req,res)=>{
    const userId = req.authUser.id
    const notes = await prisma.notes.findMany({
        where: {
            author_id: Number(userId)
        }
    })
    res.status(200).json(notes)
})

router.get('/:id', async (req,res)=>{
    const noteId = req.params.id
    const userId = req.authUser.id

    const note = await prisma.notes.findUnique({
        where: {
            id: Number(noteId),
            author_id: Number(userId)
        }
    })
    if(!note){
        return res.status(404).json({ message: "Note not found" })
    }
    res.status(200).json(note)
})

router.put('/:id', async (req,res)=>{
    try{
        const userId = req.authUser.id
        const result = noteSchema.safeParse(req.body)
        if (!result.success) {
            return res.status(400).json({ error: result.error.issues })
        }

        const updatedNote = await prisma.notes.update({
            where: {
                id: Number(req.params.id),
                author_id: Number(userId)
            },
            data: {
                note: result.data.note,
                color: result.data.color,
                position: result.data.position
            }
        })
        res.status(200).json(updatedNote)
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ message: 'Note not found' })
        }
        console.error(err)
        res.status(500).json({ message: 'Internal server error' })
    }
})

router.delete('/:id', async (req, res) => {
    try{
  const deletedNote = await prisma.notes.delete({
    where: {
      id: Number(req.params.id),
      author_id: Number(req.authUser.id)
    }
  })
  res.status(200).json(deletedNote)
  } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ message: 'Note not found' })
        }
        console.error(err)
        res.status(500).json({ message: 'Internal server error' })
    }
})

router.patch('/:id', async (req,res)=>{
    try{
    const userId = req.authUser.id
    const notePatchSchema = noteSchema.partial()
    const result = notePatchSchema.safeParse(req.body)
    if (!result.success) {
        return res.status(400).json({ error: result.error.issues })
    }

    const updatedNote = await prisma.notes.update({
        where: {
            id: Number(req.params.id),
            author_id: Number(userId)
        },
        data: {
            note: result.data.note,
            color: result.data.color,
            position: result.data.position
        }
    })
    res.status(200).json(updatedNote)
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ message: 'Note not found' })
        }
        console.error(err)
        res.status(500).json({ message: 'Internal server error' })
    }
})

router.post('/', async (req,res)=>{
    const userId = req.authUser.id
    const noteCreateSchema = noteSchema.extend({
        boardId: z.number().int()
    })
    const result = noteCreateSchema.safeParse(req.body)
    if (!result.success) {
        return res.status(400).json({ error: result.error.issues })
    }   
    const { boardId } = result.data
    const board = await prisma.boards.findUnique({
        where: {id: Number(boardId)}
    })
    if(!board){
        return res.status(404).json({ message: "Board not found" })
    }
    if (!board.userIds.includes(String(userId))) {
      return res.status(403).json({ error: "No access to this board" });
    }
    try {
    const note = await prisma.notes.create({
        data:{
            author_id: Number(userId),
            boardId: Number(board.id),
            note: result.data.note,
            color: result.data.color,
            position: result.data.position

        }
    
    })
    res.status(201).json({
            message: "Note created succesfully",
            note: note
        });
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Internal server error' })
    }
})


module.exports = router