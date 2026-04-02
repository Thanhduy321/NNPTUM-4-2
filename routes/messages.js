var express = require("express");
var router = express.Router();
let messageModel = require("../schemas/messages");
const { checkLogin } = require("../utils/authHandler");
let mongoose = require("mongoose");

// 1. GET "/" - Lấy message cuối cùng của mỗi user mà user hiện tại nhắn tin hoặc user khác nhắn cho
router.get("/", checkLogin, async function (req, res, next) {
    try {
        let currentUserId = req.user._id;

        // Dùng aggregate để nhóm (group) tin nhắn lại với nhau theo "người bạn nhắn cùng" (partner)
        let messages = await messageModel.aggregate([
            {
                $match: {
                    $or: [
                        { from: new mongoose.Types.ObjectId(currentUserId) },
                        { to: new mongoose.Types.ObjectId(currentUserId) }
                    ],
                    isDeleted: false
                }
            },
            {
                $sort: { createdAt: -1 } // Sắp xếp tin mới nhất lên trên trước khi group
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$from", new mongoose.Types.ObjectId(currentUserId)] },
                            "$to", // Nếu mình là người gửi, thì partner là người nhận
                            "$from" // Nếu mình là người nhận, thì partner là người gửi
                        ]
                    },
                    latestMessage: { $first: "$$ROOT" } // Lấy tin nhắn đầu tiên trong nhóm (đã là mới nhất)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "partnerInfo"
                }
            },
            {
                $unwind: "$partnerInfo"
            },
            {
                $project: {
                    "partnerInfo.password": 0 // Che giấu password của user trả về
                }
            },
            {
                $sort: { "latestMessage.createdAt": -1 } // Sắp xếp lại danh sách các phòng chat ưu tiên người vừa nhắn
            }
        ]);

        res.send(messages);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// 2. GET "/:userID" - Lấy toàn bộ message từ current user tới userID và ngược lại
router.get("/:userID", checkLogin, async function (req, res, next) {
    try {
        let currentUserId = req.user._id;
        let partnerId = req.params.userID;

        let messages = await messageModel.find({
            $or: [
                { from: currentUserId, to: partnerId }, // Nếu user gửi partner
                { from: partnerId, to: currentUserId }  // Nếu partner gửi user
            ],
            isDeleted: false
        })
            .sort({ createdAt: 1 }) // Tin cũ ở trên, mới ở dưới
            .populate("from", "username fullname avatarUrl")
            .populate("to", "username fullname avatarUrl");

        res.send(messages);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// 3. POST "/" - Lưu tin nhắn
router.post("/", checkLogin, async function (req, res, next) {
    try {
        let currentUserId = req.user._id;
        let { to, type, text } = req.body;

        if (!to || !text) {
            return res.status(400).send({ message: "Vui lòng truyền id người nhận ('to') và nội dung ('text')" });
        }

        let newMessage = new messageModel({
            from: currentUserId,
            to: to,
            messageContent: {
                type: type === "file" ? "file" : "text",
                text: text
            }
        });

        await newMessage.save();
        res.send(newMessage);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

module.exports = router;
