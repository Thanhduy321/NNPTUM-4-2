const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 25,
    secure: false, // Use true for port 465, false for port 587
    auth: {
        user: "",
        pass: "",
    },
});
module.exports = {
    sendMail: async function (to, url) {
        const info = await transporter.sendMail({
            from: 'hehehe@gmail.com',
            to: to,
            subject: "reset password URL",
            text: "click vao day de doi pass",
            html: "click vao <a href=" + url + ">day</a> de doi pass",
        });
        console.log("Message sent:", info.messageId);
    },
    sendPasswordMail: async function (to, username, password) {
        const info = await transporter.sendMail({
            from: 'hehehe@gmail.com',
            to: to,
            subject: "Thong tin tai khoan cua ban",
            text: `Xin chao ${username},\nTai khoan cua ban da duoc tao.\nUsername: ${username}\nPassword: ${password}\nVui long doi mat khau sau khi dang nhap.`,
            html: `<h3>Xin chao <b>${username}</b>,</h3>
                   <p>Tai khoan cua ban da duoc tao thanh cong.</p>
                   <p><b>Username:</b> ${username}</p>
                   <p><b>Password:</b> ${password}</p>
                   <p style="color:red;">Vui long doi mat khau ngay sau khi dang nhap lan dau.</p>`,
        });
        console.log("Password mail sent to:", to, "| messageId:", info.messageId);
    }
}
