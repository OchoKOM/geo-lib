import UserProfile from './UserProfile'

export default async function Page({ params }: { params: { username: string } }) {
    const { username } = await params
  return <UserProfile username={username} />
}
