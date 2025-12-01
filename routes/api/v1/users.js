import express from 'express';
var router = express.Router();

router.get("/", async (req, res) => {
    const users = await req.models.User.find({});
    res.status(200).json(users);
});

router.get("/:username/readlist", async (req, res) => {
    const user = await req.models.User.findOne({username: req.params.username});
    if (!user) {
        return res.status(404).json({
            status: "error",
            error: `username: ${req.params.username} not found`
        });
    }
    console.log (req.params.username + ":" + user);
    res.status(200).json(user.readList);
});

router.get("/:username/taglist", async (req, res) => {
    const user = await req.models.User.findOne({username: req.params.username});
    if (!user) {
        return res.status(404).json({
            status: "error",
            error: `username: ${req.params.username} not found`
        });
    }
    console.log (req.params.username + ":" + user);
    res.status(200).json(user.tagList);
});



export default router;
