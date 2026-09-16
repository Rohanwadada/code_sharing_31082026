'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import MyTeams from '@/components/project/my_teams';
import MyOrganization from '@/components/project/my_organization';
import axios from '@/lib/axios';

const ProjectDetailPage = () => {
  const params = useParams();
  const projectId = params?.projectId;

  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.post('/project/details', { project_id: projectId });
        setProjectData(response.data);
      } catch (err) {
        console.error('Failed to fetch project details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', background: '#f7f5f0', minHeight: '100vh' }}>
        <p>Loading project details...</p>
      </div>
    );
  }

  const mandate = projectData?.project_details?.project_mandate;

  if (mandate === 'organization') {
    return <MyOrganization projectData={projectData} />;
  }

  return <MyTeams projectData={projectData} />;
};

export default ProjectDetailPage;
