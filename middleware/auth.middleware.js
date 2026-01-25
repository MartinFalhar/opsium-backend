import jwt from "jsonwebtoken";

/**
 * Middleware pro autentizaci pomocí JWT tokenu
 * Extrahuje token z Authorization header a dekóduje uživatelská data
 * Přidává data uživatele (včetně branch_id) do req.user
 */
export function authenticateToken(req, res, next) {
  // Získáme token z Authorization header (formát: "Bearer TOKEN")
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Chybí autentizační token' 
    });
  }

  try {
    // Ověříme a dekódujeme token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );
    
    // Přidáme dekódovaná data do request objektu
    // Teď budou dostupná ve všech kontrolerech jako req.user
    req.user = decoded;
    
    next(); // Pokračujeme na další middleware/kontroler
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token vypršel, přihlaste se znovu' 
      });
    }
    return res.status(403).json({ 
      success: false, 
      message: 'Neplatný token' 
    });
  }
}

/**
 * Volitelný middleware - pokud je token přítomen, dekóduj ho, jinak pokračuj
 * Užitečné pro endpointy, které mohou fungovat i bez přihlášení
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'your-secret-key-change-in-production'
      );
      req.user = decoded;
    } catch (err) {
      // Token je neplatný, ale pokračujeme bez autentizace
      req.user = null;
    }
  }
  
  next();
}
