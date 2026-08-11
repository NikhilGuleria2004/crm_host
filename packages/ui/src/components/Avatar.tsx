interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ src, alt, initials, size = 'md', className = '' }: AvatarProps) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={alt || 'Avatar'}
        className={`rounded-full object-cover ${sizes[size]} ${className}`}
      />
    );
  }

  const fallback = initials || '?';
  return (
    <div
      className={`rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium ${sizes[size]} ${className}`}
      aria-label={alt || fallback}
    >
      {fallback}
    </div>
  );
}
