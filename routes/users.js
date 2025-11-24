import express from 'express';
var router = express.Router();

router.get("/", async (req, res) => {
    const users = await req.models.User.find({});
    res.status(200).json(users);
});


export default router;
