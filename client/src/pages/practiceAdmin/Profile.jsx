import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import Card from '../../components/common/Card';
import ProfilePictureUpload from '../../components/common/ProfilePictureUpload';

import FileService from '../../services/file.service';
import UserProfileService from '../../services/userProfile.service';
import PracticeAdminService from '../../services/practiceAdmin.service';
import { authSuccess } from '../../store/slices/authSlice';

import styles from '../provider/Settings.module.css';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '—');

const PracticeAdminProfile = () => {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  const [practiceName, setPracticeName] = useState('—');
  const [memberSince, setMemberSince] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await UserProfileService.getCurrentUser();
        setMemberSince(me.createdAt || me.practiceAdminProfile?.invitedAt || null);
      } catch (e) { /* non-fatal */ }
      try {
        const res = await PracticeAdminService.getPractice();
        if (res.practice?.name) setPracticeName(res.practice.name);
      } catch (e) { /* non-fatal */ }
    })();
  }, []);

  const onUpload = async (file) => {
    const response = await FileService.uploadProfilePicture(file);
    const fresh = await UserProfileService.getCurrentUser();
    dispatch(authSuccess(fresh));
    setProfileImage(fresh.profileImage);
    return response;
  };

  const onRemove = async () => {
    await FileService.deleteProfilePicture();
    const fresh = await UserProfileService.getCurrentUser();
    dispatch(authSuccess(fresh));
    setProfileImage(null);
  };

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Profile</h1>
          <p>Your Practice Admin account details.</p>
        </div>
      </div>

      <Card className={styles.profileCard}>
        <div className={styles.cardHeader}>
          <h2>Profile Information</h2>
          <p>Update your profile picture.</p>
        </div>

        <div className={styles.profileSection}>
          <div className={styles.profilePictureSection}>
            <ProfilePictureUpload
              currentImage={profileImage ? FileService.getProfilePictureUrl(profileImage, user?._id || user?.id, true) : null}
              onUpload={onUpload}
              onDelete={onRemove}
              size="large"
            />
          </div>

          <div className={styles.profileInfo}>
            <div className={styles.infoItem}>
              <strong>Name:</strong> {user?.firstName} {user?.lastName}
            </div>
            <div className={styles.infoItem}>
              <strong>Email:</strong> {user?.email}
            </div>
            <div className={styles.infoItem}>
              <strong>Role:</strong> Practice Admin
            </div>
            <div className={styles.infoItem}>
              <strong>Practice:</strong> {practiceName}
            </div>
            <div className={styles.infoItem}>
              <strong>Member since:</strong> {fmtDate(memberSince)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PracticeAdminProfile;
