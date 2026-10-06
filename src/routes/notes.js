const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const authorize = require('../middleware/authorize')
const { z } = require('zod')
const access = require('../middleware/access')

const prisma = new PrismaClient()

router.use(authorize)

const noteSchema = z.object({
    note: z.string(),
    color: z.string(),
    position: z.object({ x: z.number(), y: z.number() })
})

router.get('/:boardId', async (req, res) => {
    try {
        const userId = req.authUser.sub
        const boardId = Number(req.params.boardId)
        if (!Number.isInteger(boardId)) {
            return res.status(400).json({ message: "Invalid board id" })
        }
        const board = await prisma.boards.findUnique({
            where: {
                id: boardId,
                userIds: { has: String(userId) }
            }
        })
        if (!board) {
            return res.status(404).json({ message: "Board not found" })
        }
        const notes = await prisma.notes.findMany({
            where: {
                boardId: board.id,
            }
        })
        res.status(200).json(notes)
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.put('/:boardId/:id', access, async (req, res) => {
    try {
        const noteId = Number(req.params.id)
        if (!Number.isInteger(noteId)) {
            return res.status(400).json({ message: "Invalid note id" })
        }
        const result = noteSchema.safeParse(req.body)
        if (!result.success) {
            return res.status(400).json({ error: result.error.issues })
        }

        const updatedNote = await prisma.notes.update({
            where: {id: noteId, boardId: req.board.id},
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


router.patch('/:boardId/:id',access, async (req, res) => {
    try {
        const noteId = Number(req.params.id)
        if (!Number.isInteger(noteId)) {
            return res.status(400).json({ message: "Invalid note id" })
        }
        const notePatchSchema = noteSchema.partial()
        const result = notePatchSchema.safeParse(req.body)
        if (!result.success) {
            return res.status(400).json({ error: result.error.issues })
        }

        const updatedNote = await prisma.notes.update({
            where: {
                id: noteId, boardId: req.board.id},
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

router.post('/', async (req, res) => {
    try {
        const userId = req.authUser.sub
        const noteCreateSchema = noteSchema.extend({
            boardId: z.number().int()
        })
        const result = noteCreateSchema.safeParse(req.body)
        if (!result.success) {
            return res.status(400).json({ error: result.error.issues })
        }
        const { boardId } = result.data
        const board = await prisma.boards.findUnique({
            where: { id: Number(boardId) }
        })
        if (!board) {
            return res.status(404).json({ message: "Board not found" })
        }
        if (!board.userIds.includes(String(userId))) {
            return res.status(403).json({ error: "No access to this board" });
        }
        const note = await prisma.notes.create({
            data: {
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

router.delete('/:boardId/:id', access, async (req, res) => {
    try {
        const noteId = Number(req.params.id)
        if (!Number.isInteger(noteId)) {
            return res.status(400).json({ message: "Invalid note id" })
        }
        const deletedNote = await prisma.notes.delete({
            where: {
                id: noteId,
                boardId: req.board.id,
                author_id: req.authUser.sub
            }
        })
        res.status(200).json({
            message: "Note deleted successfully",
            note: deletedNote
        })
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ message: 'Note not found' })
        }
        console.error(err)
        res.status(500).json({ message: 'Internal server error' })
    }
})



module.exports = router