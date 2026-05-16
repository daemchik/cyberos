import React from "react";
import { CheckSquare, Square, Plus, Clock, User } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { api } from "../lib/api";

type TaskPriority = "high" | "medium" | "low";
type TaskStatus = "pending" | "completed";

type Task = {
  id: number;
  text: string;
  priority: TaskPriority;
  status: TaskStatus;
  creator: string;
  time: string;
};

function priorityLabel(priority: TaskPriority) {
  if (priority === "high") return "Высокий";
  if (priority === "medium") return "Средний";
  return "Низкий";
}

function priorityBadgeClass(priority: TaskPriority) {
  if (priority === "high") return "text-red-500 border-red-500/20 bg-red-500/5";
  if (priority === "medium") return "text-orange-500 border-orange-500/20 bg-orange-500/5";
  return "text-blue-500 border-blue-500/20 bg-blue-500/5";
}


export function TasksManager() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [showTaskModal, setShowTaskModal] = React.useState(false);
  const [newTaskText, setNewTaskText] = React.useState("");
  const [newTaskPriority, setNewTaskPriority] = React.useState<TaskPriority>("medium");

  const load = async () => {
    try {
      const data = await api.getTasks();
      setTasks(
        data.map((t: any) => {
          const pr = t.priority === "high" || t.priority === "low" ? t.priority : "medium";
          return {
            ...t,
            priority: pr as TaskPriority,
            time: new Date(t.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          };
        })
      );

    } catch (e: any) { toast.error(e.message); }
  };

  React.useEffect(() => { load(); }, []);

  const toggleTask = async (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    try {
      if (task.status === "pending") { await api.completeTask(id); toast.success("Задача выполнена"); }
      else { await api.reopenTask(id); }
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const changePriority = async (id: number, next: TaskPriority) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.priority === next) return;
    try {
      await api.updateTask(id, { priority: next });
      toast.success("Приоритет обновлён");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const completedTodayCount = tasks.filter((t) => t.status === "completed").length;


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#0A0A0B] border border-[#2A2A2C] p-8 shadow-2xl">
        <div className="flex flex-col">
          <h2 className="text-lg md:text-xl font-black uppercase tracking-wider text-white">Список задач</h2>
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-1">
            Оперативный контроль: задания администратора
          </span>
        </div>

        <button
          onClick={() => setShowTaskModal(true)}
          className="bg-[#00FF00] hover:bg-[#00EE00] text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
          type="button"
        >
          <Plus size={16} />
          НОВАЯ ЗАДАЧА
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-2">
          {tasks.map((task) => (
            <motion.div
              layout
              key={task.id}
              className={cn(
                "group flex items-center gap-6 p-6 border transition-all",
                task.status === "completed"
                  ? "bg-black/20 border-zinc-900 opacity-50"
                  : "bg-[#0A0A0B] border-[#2A2A2C] hover:border-zinc-700"
              )}
            >
              <button
                type="button"
                onClick={() => void toggleTask(task.id)}
                className={cn(
                  "p-2 border transition-colors shrink-0",
                  task.status === "completed"
                    ? "text-[#00FF00] border-[#00FF00]/20"
                    : "text-zinc-700 border-zinc-800 group-hover:text-zinc-500"
                )}
              >
                {task.status === "completed" ? <CheckSquare size={20} /> : <Square size={20} />}
              </button>


              <div className="flex-1">
                <p
                  className={cn(
                    "text-sm font-bold transition-all",
                    task.status === "completed" ? "line-through text-zinc-600" : "text-zinc-200"
                  )}
                >
                  {task.text}
                </p>

                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                    <Clock size={10} />
                    <span>{task.time}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                    <User size={10} />
                    <span>{task.creator}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={cn("px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] border", priorityBadgeClass(task.priority))}>
                  {priorityLabel(task.priority)}
                </span>
                <select
                  value={task.priority}
                  onChange={(e) => void changePriority(task.id, e.target.value as TaskPriority)}
                  disabled={task.status === "completed"}
                  className="bg-black border border-zinc-800 text-[9px] font-mono text-zinc-300 py-1.5 px-2 uppercase tracking-wider focus:border-[#00FF00]/50 outline-none disabled:opacity-40"
                >
                  <option value="high">Высокий</option>
                  <option value="medium">Средний</option>
                  <option value="low">Низкий</option>
                </select>
              </div>

            </motion.div>
          ))}
        </div>

        <div className="bg-[#0A0A0B] border border-[#2A2A2C] p-8 space-y-8">
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-[0.2em]">Статистика</h3>

            <div className="pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-zinc-600 uppercase">Ожидает</span>
                <span className="text-sm font-mono text-white">{pendingCount}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-zinc-600 uppercase">Решено сегодня</span>
                <span className="text-sm font-mono text-[#00FF00]">{completedTodayCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
