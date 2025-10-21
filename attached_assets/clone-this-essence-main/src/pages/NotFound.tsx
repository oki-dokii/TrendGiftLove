import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.h1 
          className="mb-4 text-8xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
          whileHover={{ 
            scale: 1.1,
            rotateY: 10,
            transition: { type: "spring", stiffness: 300 }
          }}
        >
          404
        </motion.h1>
        <motion.p 
          className="mb-4 text-xl text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Oops! Page not found
        </motion.p>
        <motion.a 
          href="/" 
          className="text-primary underline hover:text-accent transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Return to Home
        </motion.a>
      </motion.div>
    </div>
  );
};

export default NotFound;
