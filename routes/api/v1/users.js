import express from 'express';
var router = express.Router();

/** Helper: must be logged in */
function requireLogin(req, res, next) {
  if (!req.session?.isAuthenticated || !req.session.account) {
    return res.status(401).json({ status: "error", error: "not logged in" });
  }
  next();
}

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

// DELETE /api/v1/users/readingList
router.delete("/readingList/:bookId", requireLogin, async (req, res) => {
  try {
    const { bookId } = req.params;
    const username = req.session.account.username;

    const user = await req.models.User.findOne({ username });
    if (!user) {
      return res.status(404).json({status: "error", error: "user not found" });
    }

    // Pull bookId from readList array
    user.readList = (user.readList || []).filter(
      (id) => id.toString() !== bookId
    );
    await user.save();

    return res.json({ status: "success" });
  }
  catch (err) {
    console.error("DELETE /api/v1/users/readingList/:bookId error:", err);
    return res.status(500).json({ status: "error", error: "Internal error updating reading list"});
  }
});

// DELETE /api/v1/users/readingList
router.delete("/readingList/:bookId", requireLogin, async (req, res) => {
  try {
    const { bookId } = req.params;
    const username = req.session.account.username;

    const user = await req.models.User.findOne({ username });
    if (!user) {
      return res.status(404).json({status: "error", error: "user not found" });
    }

    // Pull bookId from readList array
    user.readList = (user.readList || []).filter(
      (id) => id.toString() !== bookId
    );
    await user.save();

    return res.json({ status: "success" });
  }
  catch (err) {
    console.error("DELETE /api/v1/users/readingList/:bookId error:", err);
    return res.status(500).json({ status: "error", error: "Internal error updating reading list"});
  }
});

export default router;
