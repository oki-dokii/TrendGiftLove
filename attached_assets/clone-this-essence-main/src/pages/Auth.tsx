import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Mail, Lock, User } from "lucide-react";
import { Link } from "react-router-dom";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated background elements */}
      <motion.div
        className="absolute inset-0 opacity-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 1 }}
      >
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -30, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <motion.div
          drag
          dragConstraints={{ left: -30, right: 30, top: -30, bottom: 30 }}
          dragElastic={0.1}
          whileHover={{ scale: 1.02 }}
          className="cursor-grab active:cursor-grabbing"
        >
          <Card className="bg-card/80 backdrop-blur-md border-border shadow-[0_8px_32px_rgba(168,85,247,0.2)]">
            <CardHeader className="space-y-4">
              <motion.div
                className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                whileHover={{ rotateY: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <CardTitle className="text-3xl text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {isLogin ? "Welcome Back" : "Create Account"}
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                {isLogin
                  ? "Sign in to continue your journey"
                  : "Start your gift-finding adventure"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label htmlFor="name" className="text-foreground">
                    Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      className="pl-10 bg-background/50 border-border focus:border-primary transition-colors"
                    />
                  </div>
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 bg-background/50 border-border focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 bg-background/50 border-border focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-[0_4px_20px_rgba(168,85,247,0.3)]"
                  size="lg"
                >
                  {isLogin ? "Sign In" : "Sign Up"}
                </Button>
              </motion.div>

              <div className="text-center text-sm text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-2 text-primary hover:text-accent transition-colors font-medium"
                >
                  {isLogin ? "Sign Up" : "Sign In"}
                </button>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="text-center"
              >
                <Link
                  to="/"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Back to Home
                </Link>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auth;
