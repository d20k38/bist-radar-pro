export default function handler(req,res){res.status(200).json({success:true,version:'v8-real-data',time:new Date().toISOString()});}
