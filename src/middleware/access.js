const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = async (req, res, next) => {
    try {
        const userId = req.authUser.sub
        const board = await prisma.boards.findUnique({
            where: { id: Number(req.params.boardId)}})
        if(!board){
            return res.status(404).json({ message: "Board not found" })
        }
        if (!board.userIds.includes(String(userId))) {
            return res.status(403).json({ message: "No access to this board" })
        }
        req.board = board
        next()
        
       
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}
