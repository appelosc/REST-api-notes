const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const authorize = require('../middleware/authorize')

const prisma = new PrismaClient()

router.use(authorize)

router.post('/', async (req,res)=>{
    const{boardId} = req.body
    console.log("req.body:", req.body);
    console.log("boardId:", boardId, typeof boardId);
    
    const userId = req.authUser.id
    const board = await prisma.boards.findUnique({
        where: {id: Number(boardId)}
    })
    if(!board){
        return res.status(404).json({ message: "Board not found" })
    }
    if (!board.userIds.includes(String(userId))) {
      return res.status(403).json({ error: "No access to this board" });
    }
    const notes = await prisma.notes.create({
        data:{
            author_id: Number(userId),
            boardId: Number(board.id),
            note: req.body.note,
            color: req.body.color,
            position: req.body.position

        }
    
    })
    res.status(200).json({
            message: "Note created succesfully",
        });
})
module.exports = router