export function ChatMessage({msg}: {msg: any}) {
    return (
        <div
            key={msg.id}
            className={`flex ${msg.senderId === 0 ? "justify-end" : "justify-start"}`}
        >
            <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${
                    msg.senderId === 0
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-slate-100 text-slate-900 rounded-tl-none"
                }`}
            >
                <p>{msg.text}</p>
                <span className="text-[10px] opacity-70 mt-1 block text-right">
                    {msg.time}
                </span>
            </div>
        </div>
    );
}
