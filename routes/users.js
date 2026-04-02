var express = require("express");
var router = express.Router();
let { validatedResult, CreateUserValidator, ModifyUserValidator } = require("../utils/validator")
let userModel = require("../schemas/users");
let roleModel = require("../schemas/roles");
let userController = require("../controllers/users");
const { checkLogin, checkRole } = require("../utils/authHandler");
const { uploadCsv } = require("../utils/uploadHandler");
const { sendPasswordMail } = require("../utils/mailHandler");
const fs = require("fs");
const { parse } = require("csv-parse");
const crypto = require("crypto");


router.get("/", checkLogin, checkRole("ADMIN", "MODERATOR"), async function (req, res, next) {
  let users = await userModel
    .find({ isDeleted: false })
  res.send(users);
});

router.get("/:id", async function (req, res, next) {
  try {
    let result = await userModel
      .find({ _id: req.params.id, isDeleted: false })
    if (result.length > 0) {
      res.send(result);
    }
    else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

router.post("/", CreateUserValidator, validatedResult, async function (req, res, next) {
  try {
    let newUser = await userController.CreateAnUser(
      req.body.username, req.body.password, req.body.email,
      req.body.role, req.body.fullname, req.body.avatarUrl
    )
    res.send(newUser);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.put("/:id", ModifyUserValidator, validatedResult, async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedItem) return res.status(404).send({ message: "id not found" });

    let populated = await userModel
      .findById(updatedItem._id)
    res.send(populated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.delete("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }
    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// POST /users/import - import users from CSV file (columns: username, email)
router.post("/import", checkLogin, checkRole("ADMIN"), uploadCsv.single("file"), async function (req, res, next) {
  if (!req.file) return res.status(400).send({ message: "Vui long chon file CSV" });

  try {
    // Lay role "user"
    const userRole = await roleModel.findOne({ name: "user", isDeleted: false });
    if (!userRole) return res.status(400).send({ message: "Khong tim thay role 'user' trong he thong" });

    // Doc va parse CSV
    const records = await new Promise((resolve, reject) => {
      const rows = [];
      fs.createReadStream(req.file.path)
        .pipe(parse({ columns: true, trim: true, skip_empty_lines: true }))
        .on("data", (row) => rows.push(row))
        .on("end", () => resolve(rows))
        .on("error", (err) => reject(err));
    });

    const created = [];
    const errors = [];

    for (const row of records) {
      const { username, email } = row;
      if (!username || !email) {
        errors.push({ row, message: "Thieu username hoac email" });
        continue;
      }
      try {
        // Kiem tra trung
        const exists = await userModel.findOne({ $or: [{ username }, { email }], isDeleted: false });
        if (exists) {
          errors.push({ username, email, message: "Username hoac email da ton tai" });
          continue;
        }

        // Tao password random 16 ky tu
        const password = crypto.randomBytes(8).toString("hex"); // 8 bytes -> 16 hex chars

        // Tao user (password se duoc hash do pre-save hook)
        const newUser = await userController.CreateAnUser(
          username, password, email, userRole._id, null,
          "", undefined, true, 0
        );

        // Gui email password cho user
        await sendPasswordMail(email, username, password);

        created.push({ username, email, userId: newUser._id });
      } catch (err) {
        errors.push({ username, email, message: err.message });
      }
    }

    // Xoa file tam sau khi xu ly
    fs.unlink(req.file.path, () => { });

    res.send({
      message: `Import hoan tat: ${created.length} thanh cong, ${errors.length} loi`,
      created,
      errors
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

module.exports = router;
