export function ChatMessage({ msg }: { msg: any }) {
    const isMe = msg.senderId === 0;
    return (
        <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                isMe
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-white text-slate-900 rounded-bl-sm border border-slate-100"
            }`}>
                <p className="leading-relaxed">{msg.text}</p>
                <span className={`text-[10px] mt-1 block text-right ${isMe ? "text-blue-200" : "text-slate-400"}`}>
                    {msg.time}
                </span>
            </div>
        </div>
    );
}