'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import MyTeams from '@/components/project/my_teams';
import MyOrganization from '@/components/project/my_organization';
import axios from '@/lib/axios';
import { useSidebarStore } from '@/store/sidebarStore';
import { useAuthStore } from '@/store/authStore';

const ProjectDetailPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params?.projectId;
  const setActiveTab = useSidebarStore((s) => s.setActiveTab);
  const userDetails = useAuthStore((s) => s.userDetails);

  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.post('/project/details', { project_id: projectId });
        const data = response.data;
        setProjectData(data);

        // #changes 28-09-2026 - start: Sync sidebar active tab with mandate for admin users
        const userRole = (userDetails?.role || userDetails?.provided_role || '').toLowerCase().trim();
        const isAdmin = ['admin', 'superadmin', 'organization_admin'].includes(userRole);
        const mandateFromUrl = searchParams?.get('mandate');
        const mandate = mandateFromUrl || data?.project_details?.project_mandate;
        if (isAdmin) {
          if (mandate === 'organization') {
            setActiveTab('org-projects');
          } else if (mandate === 'team') {
            setActiveTab('team-projects');
          }
        }
        // #changes 28-09-2026 - end
      } catch (err) {
        console.error('Failed to fetch project details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId, searchParams, setActiveTab]);

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', background: '#f7f5f0', minHeight: '100vh' }}>
        <p>Loading project details...</p>
      </div>
    );
  }

  const mandateFromUrl = searchParams?.get('mandate');
  const mandate = mandateFromUrl || projectData?.project_details?.project_mandate;

  if (mandate === 'organization') {
    return <MyOrganization projectData={projectData} />;
  }

  return <MyTeams projectData={projectData} />;
};

export default ProjectDetailPage;
