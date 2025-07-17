import Head from 'next/head'
import React from 'react'
import AdminPage from '../../components/Admin/AdminPage'
import AuthGuard from '../../components/Auth/AuthGuard'

const admin = () => {
  return (
    <AuthGuard requireAuth={true} requiredRole="ADMIN">
      <Head>
        <title>Admin Dashboard</title>
      </Head>
      <AdminPage/>
    </AuthGuard>
  )
}

export default admin