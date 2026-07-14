type Props = {
  title: string;
};

export default function PlaceholderView({ title }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
        <span className="w-2 h-2 rounded-full bg-indigo-400" />
      </div>
      <h2 className="text-slate-200 font-semibold mb-1">{title}</h2>
      <p className="text-sm text-slate-500 max-w-xs">Esta sección está en construcción. De momento la oficina 3D es la vista principal.</p>
    </div>
  );
}
