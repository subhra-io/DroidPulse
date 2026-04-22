interface Props {
  connected: boolean
}

export function ConnectionStatus({ connected }: Props) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-sm">
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  )
}
