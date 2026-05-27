import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import TeacherDashboard from "./pages/TeacherDashboard.tsx";
import HostRoom from "./pages/HostRoom.tsx";
import JoinRoom from "./pages/JoinRoom.tsx";
import PlayRoom from "./pages/PlayRoom.tsx";
import GameResults from "./pages/GameResults.tsx";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="bingo-mat-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/professor" element={<TeacherDashboard />} />
            <Route path="/sala/:id/host" element={<HostRoom />} />
            <Route path="/entrar" element={<JoinRoom />} />
            <Route path="/entrar/:roomId" element={<JoinRoom />} />
            <Route path="/jogar/:roomId/:playerId" element={<PlayRoom />} />
            <Route path="/resultados/:roomId" element={<GameResults />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
