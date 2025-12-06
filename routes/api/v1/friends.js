import express from "express";

const router = express.Router();

// Middleware to check authentication
const requireLogin = (req, res, next) => {
    if (!req.session?.isAuthenticated || !req.session.account) {
        return res.status(401).json({
            status: "error",
            error: "not logged in"
        });
    }
    next();
};

// POST /api/v1/friends/:listname - Create or update a friend list
router.post("/:listname", requireLogin, async (req, res) => {
    try {
        const { listname } = req.params;
        const { description, members } = req.body;
        
        const FriendList = req.models.FriendList;
        const User = req.models.User;

        // Get current user from session
        const username = req.session.account.username;
        const currentUser = await User.findOne({ username });
        if (!currentUser) {
            return res.status(404).json({ status: "error", error: "user not found" });
        }

        // Check if list already exists for this user
        const existingList = await FriendList.findOne({
            friendListOwnerId: currentUser._id,
            friendListName: listname
        });

        if (existingList) {
            // Update existing list
            if (description) existingList.friendListDesc = description;
            if (members) existingList.listMembers = members;
            
            await existingList.save();

            return res.json({
                status: "success",
                message: "Friend list updated",
                friendList: existingList
            });
        }

        // Create new friend list
        const newList = new FriendList({
            friendListOwnerId: currentUser._id,
            friendListName: listname,
            friendListDesc: description || "",
            listPrivacyInfo: "private",
            listMembers: members || []
        });

        await newList.save();

        // Add to user's friendLists array
        await User.findByIdAndUpdate(
            currentUser._id,
            { $push: { friendLists: newList._id } }
        );

        return res.status(201).json({
            status: "success",
            message: "Friend list created",
            friendList: newList
        });

    } catch (error) {
        console.error("Create friend list error:", error);
        return res.status(500).json({
            status: "error",
            error: "Server error creating friend list"
        });
    }
});

// GET /api/v1/friends/:listname - Get members of a friend list
router.get("/:listname", requireLogin, async (req, res) => {
    try {
        const { listname } = req.params;
        
        const FriendList = req.models.FriendList;
        const User = req.models.User;

        // Get current user from session
        const username = req.session.account.username;
        const currentUser = await User.findOne({ username });
        if (!currentUser) {
            return res.status(404).json({ status: "error", error: "user not found" });
        }

        // Find the friend list
        const friendList = await FriendList.findOne({
            friendListOwnerId: currentUser._id,
            friendListName: listname
        }).populate('listMembers', 'username displayName');

        if (!friendList) {
            return res.status(404).json({
                status: "error",
                error: "Friend list not found"
            });
        }

        return res.json({
            status: "success",
            friendList: {
                name: friendList.friendListName,
                description: friendList.friendListDesc,
                members: friendList.listMembers,
                memberCount: friendList.listMembers.length
            }
        });

    } catch (error) {
        console.error("Get friend list error:", error);
        return res.status(500).json({
            status: "error",
            error: "Server error retrieving friend list"
        });
    }
});

// GET /api/v1/friends - Get all friend lists for current user
router.get("/", requireLogin, async (req, res) => {
    try {
        const FriendList = req.models.FriendList;
        const User = req.models.User;

        // Get current user from session
        const username = req.session.account.username;
        const currentUser = await User.findOne({ username });
        if (!currentUser) {
            return res.status(404).json({ status: "error", error: "user not found" });
        }

        const friendLists = await FriendList.find({
            friendListOwnerId: currentUser._id
        }).populate('listMembers', 'username displayName');

        return res.json({
            status: "success",
            friendLists: friendLists.map(list => ({
                name: list.friendListName,
                description: list.friendListDesc,
                memberCount: list.listMembers.length,
                id: list._id
            }))
        });

    } catch (error) {
        console.error("Get friend lists error:", error);
        return res.status(500).json({
            status: "error",
            error: "Server error retrieving friend lists"
        });
    }
});

// POST /api/v1/friends/:listname/members - Add member to friend list
router.post("/:listname/members", requireLogin, async (req, res) => {
    try {
        const { listname } = req.params;
        const { userId } = req.body;
        
        const FriendList = req.models.FriendList;
        const User = req.models.User;

        // Get current user from session
        const username = req.session.account.username;
        const currentUser = await User.findOne({ username });
        if (!currentUser) {
            return res.status(404).json({ status: "error", error: "user not found" });
        }

        // Verify user to add exists
        const userToAdd = await User.findById(userId);
        if (!userToAdd) {
            return res.status(404).json({
                status: "error",
                error: "User not found"
            });
        }

        // Find friend list
        const friendList = await FriendList.findOne({
            friendListOwnerId: currentUser._id,
            friendListName: listname
        });

        if (!friendList) {
            return res.status(404).json({
                status: "error",
                error: "Friend list not found"
            });
        }

        // Check if already a member
        if (friendList.listMembers.includes(userId)) {
            return res.status(400).json({
                status: "error",
                error: "User already in friend list"
            });
        }

        // Add member
        friendList.listMembers.push(userId);
        await friendList.save();

        return res.json({
            status: "success",
            message: "Member added to friend list",
            friendList
        });

    } catch (error) {
        console.error("Add member error:", error);
        return res.status(500).json({
            status: "error",
            error: "Server error adding member"
        });
    }
});

// DELETE /api/v1/friends/:listname/members/:userId - Remove member from friend list
router.delete("/:listname/members/:userId", requireLogin, async (req, res) => {
    try {
        const { listname, userId } = req.params;
        
        const FriendList = req.models.FriendList;
        const User = req.models.User;

        // Get current user from session
        const username = req.session.account.username;
        const currentUser = await User.findOne({ username });
        if (!currentUser) {
            return res.status(404).json({ status: "error", error: "user not found" });
        }

        const friendList = await FriendList.findOne({
            friendListOwnerId: currentUser._id,
            friendListName: listname
        });

        if (!friendList) {
            return res.status(404).json({
                status: "error",
                error: "Friend list not found"
            });
        }

        // Remove member
        friendList.listMembers = friendList.listMembers.filter(
            id => id.toString() !== userId
        );
        await friendList.save();

        return res.json({
            status: "success",
            message: "Member removed from friend list"
        });

    } catch (error) {
        console.error("Remove member error:", error);
        return res.status(500).json({
            status: "error",
            error: "Server error removing member"
        });
    }
});

// DELETE /api/v1/friends/:listname - Delete entire friend list
router.delete("/:listname", requireLogin, async (req, res) => {
    try {
        const { listname } = req.params;
        
        const FriendList = req.models.FriendList;
        const User = req.models.User;

        // Get current user from session
        const username = req.session.account.username;
        const currentUser = await User.findOne({ username });
        if (!currentUser) {
            return res.status(404).json({ status: "error", error: "user not found" });
        }

        const friendList = await FriendList.findOneAndDelete({
            friendListOwnerId: currentUser._id,
            friendListName: listname
        });

        if (!friendList) {
            return res.status(404).json({
                status: "error",
                error: "Friend list not found"
            });
        }

        // Remove from user's friendLists array
        await User.findByIdAndUpdate(
            currentUser._id,
            { $pull: { friendLists: friendList._id } }
        );

        return res.json({
            status: "success",
            message: "Friend list deleted"
        });

    } catch (error) {
        console.error("Delete friend list error:", error);
        return res.status(500).json({
            status: "error",
            error: "Server error deleting friend list"
        });
    }
});

export default router;