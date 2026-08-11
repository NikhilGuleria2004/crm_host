import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Users, Building2, UserPlus, Target } from 'lucide-react';
import { Button } from '@crm/ui';
import { useCreateImport } from '../hooks/useImports';

const ENTITIES = [
  { value: 'contacts', label: 'Contacts', icon: Users, description: 'Import people and their contact information' },
  { value: 'companies', label: 'Companies', icon: Building2, description: 'Import organizations and businesses' },
  { value: 'leads', label: 'Leads', icon: UserPlus, description: 'Import potential customers' },
  { value: 'deals', label: 'Deals', icon: Target, description: 'Import sales opportunities' },
];

export function ImportUpload() {
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const createMutation = useCreateImport();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedEntity || !file) {
      setError('Please select an entity type and upload a file');
      return;
    }

    try {
      setError(null);
      const result = await createMutation.mutateAsync({ entity: selectedEntity, file });
      navigate(`/app/imports/${result.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Import Data</h1>
        <p className="text-muted-foreground mt-1">Upload a CSV file to import records.</p>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Select Entity Type</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {ENTITIES.map((entity) => {
              const Icon = entity.icon;
              const isSelected = selectedEntity === entity.value;
              return (
                <button
                  key={entity.value}
                  onClick={() => setSelectedEntity(entity.value)}
                  className={`p-4 border rounded text-left transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon size={24} className={`mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="font-medium text-foreground">{entity.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{entity.description}</div>
                </button>
              );
            })}
          </div>

          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Upload File</h3>
          <div className="border-2 border-dashed border-border rounded p-8 text-center">
            <Upload size={40} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop your CSV file here, or click to browse
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <Button variant="secondary" className="cursor-pointer">
                Choose File
              </Button>
            </label>
            {file && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-foreground">
                <FileText size={16} />
                {file.name}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={!selectedEntity || !file || createMutation.isPending}
            >
              {createMutation.isPending ? 'Uploading...' : 'Upload & Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
