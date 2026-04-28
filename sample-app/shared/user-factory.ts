const generateUsername = (userIdentifier: string) =>
  `${userIdentifier}-${Date.now()}`
const generatePassword = () =>
  `pwd-${Math.random().toString(36).substring(2, 10)}`

export const generateUserData = (userIdentifier: string) => ({
  username: generateUsername(userIdentifier),
  password: generatePassword(),
  userIdentifier
})

export type UserData = {
  token: string
  userId: string
  username: string
  password: string
}
