import jwt from 'jsonwebtoken';


export const protect = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    console.log("token", token)
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized Access, No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("Decoded:", decoded);

    req.user = decoded;
    next();
  } catch (error) {
    console.error("JWT Verify Error:", error.message);
    return res.status(401).json({ success: false, message: error.message });
  }
};



export const adminOnly = async (req, res, next)=>{
  try {
    if(req.user.role !== "admin"){
      return res.status(401).json({success: false, message: "Access Denied !, Admin Only can access."})
    }
    next()
  } catch (error) {
    console.log("Error in Admin Access")
    res.status(401).json({ success: false, message: error.message });
  }
}

export const employeeOnly = async (req, res, next) =>{
  try {
    if(req.user.role !== "employee"){
      return res.status(401).json({success: false, message: "Access Denied !, Employee only can access."});
    }
    next()
  } catch (error) {
    console.log("Error in Employee Access");
    res.status(401).json({success: false, message: error.message})
  }
}

export const adminOrEmployeeOnly = async (req, res, next) =>{
  try {
    console.log("role", req.user.role)
    if(req.user.role !== "employee" && req.user.role !== "admin"){
      return res.status(401).json({success: false, message: "Access Denied !, Admin or Employee ony can access."});
    }
    next()
  } catch (error) {
    console.log("Error in Employee Access");
    res.status(401).json({success: false, message: error.message})
  }
}