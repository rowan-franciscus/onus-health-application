import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Users = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new Patients page
    navigate('/admin/patients');
  }, [navigate]);

  return null;
};

export default Users; 