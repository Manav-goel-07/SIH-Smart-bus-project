import { useRef, useState } from 'react'
import { Check, ImagePlus, LogOut, X } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'

function initials(profile) {
  return (profile?.full_name || 'AO').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

export default function ProfileMenu({ compact = false }) {
  const { profile, updateProfile, signOut } = useAuth()
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(profile?.full_name || '')
  const [avatar, setAvatar] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggle = () => {
    if (!open) setName(profile?.full_name || '')
    setError('')
    setOpen((value) => !value)
  }
  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const result = await updateProfile({ fullName: name.trim(), avatarFile: avatar })
    if (result.error) setError(result.error.message)
    else { setAvatar(null); setOpen(false) }
    setSaving(false)
  }

  return <div className={`profile-menu ${compact ? 'profile-menu-compact' : ''}`}>
    <button className="profile-trigger" title="Edit profile" onClick={toggle}>
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" /> : <span>{initials(profile)}</span>}
    </button>
    {open && <div className="profile-popover">
      <div className="profile-popover-head"><div><span className="eyebrow">Account</span><strong>Edit profile</strong></div><button className="profile-close" onClick={() => setOpen(false)}><X size={14} /></button></div>
      <form onSubmit={save}>
        <div className="profile-photo-row"><div className="profile-photo-preview">{avatar ? <img src={URL.createObjectURL(avatar)} alt="New profile" /> : profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" /> : <span>{initials(profile)}</span>}</div><button type="button" className="profile-photo-btn" onClick={() => inputRef.current?.click()}><ImagePlus size={14} /> Change photo</button><input ref={inputRef} hidden type="file" accept="image/*" onChange={(event) => setAvatar(event.target.files?.[0] || null)} /></div>
        <label className="profile-field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required /></label>
        {error && <div className="profile-error"><X size={13} />{error}</div>}
        <button className="profile-save" disabled={saving}><Check size={14} />{saving ? 'Saving...' : 'Save changes'}</button>
        <button type="button" className="profile-logout" onClick={signOut}><LogOut size={14} /> Sign out</button>
      </form>
    </div>}
  </div>
}
