"use client"

//Libs
import React from "react"

//Imports
import { AuthProvider } from "../auth"
import Login from "../../ui/Pages/Login/Login"

//Main
const LoginPage = () => {
  return (
    <AuthProvider>
      <Login />
    </AuthProvider>
  )
}

export default LoginPage
