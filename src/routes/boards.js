const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const authorize = require('../middleware/authorize')

const prisma = new PrismaClient()

router.use(authorize)

router.get('/', async (req,res)=>{
    try{
        const userId = req.authUser.sub
        const boards = await prisma.boards.findMany({
        where: {
            userIds: { has: String(userId) }
        }
    })
    res.status(200).json(boards)

    }catch(err){
        console.error(err)
        res.status(500).json({ message: 'Internal server error' })
    }

})

module.exports = router