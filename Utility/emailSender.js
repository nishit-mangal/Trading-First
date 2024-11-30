import nodemailer from "nodemailer";

let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: true,
  service: 'gmail',
  auth: {
    user: "nishitmangal5@gmail.com",
    pass: "kbmjbcktwnakpnml",
  },
});

export const triggerMail = async (email, title, body) =>{
    try{
        if(!email || !title || !body)
            throw "Missing Inputs";
        // Send emails to users
        await transporter.sendMail({
            from: 'nishitmangal5@gmail.com',
            to: email,
            subject: title,
            html: body,
        });
        return true;
    }catch(err){
        console.log("Error sending OTP mail to: ", email, ". ", err ?? "");
        return false;
    }
    
}